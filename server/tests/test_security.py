import io

from app.extensions import db
from app.models import Student, User
from app.utils.totp import code_at


def login(client, email, password="password123"):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def bearer(data):
    return {"Authorization": f"Bearer {data['access_token']}"}


def test_ten_wrong_passwords_lock_the_account(client):
    for _ in range(10):
        login(client, "parent@test.com", "wrong-password")
    response = login(client, "parent@test.com")
    assert response.status_code == 429


def test_password_change_signs_out_other_sessions(client):
    stolen = bearer(login(client, "parent@test.com").get_json())
    mine = bearer(login(client, "parent@test.com").get_json())
    client.post("/api/auth/change-password", json={"current_password": "password123", "new_password": "Brand2026new"}, headers=mine)
    assert client.get("/api/auth/me", headers=stolen).status_code == 401


def test_switched_off_account_loses_access_at_once(app, client):
    tokens = login(client, "parent@test.com").get_json()
    user = User.query.filter_by(email="parent@test.com").first()
    user.is_active = False
    db.session.commit()
    assert client.get("/api/auth/me", headers=bearer(tokens)).status_code == 401
    assert client.post("/api/auth/refresh", headers={"Authorization": f"Bearer {tokens['refresh_token']}"}).status_code == 401


def test_two_step_sign_in(app, client, admin_headers):
    setup = client.post("/api/auth/2fa/setup", headers=admin_headers).get_json()
    assert setup["link"].startswith("otpauth://totp/")
    import time
    step = int(time.time() // 30)
    enabled = client.post("/api/auth/2fa/enable", json={"code": code_at(setup["secret"], step)}, headers=admin_headers)
    assert enabled.status_code == 200 and enabled.get_json()["user"]["two_factor_enabled"] is True
    first = login(client, "admin@test.com").get_json()
    assert first.get("two_factor_required") is True and "access_token" not in first
    replay = client.post("/api/auth/2fa/verify", json={"challenge": first["challenge"], "code": code_at(setup["secret"], step)})
    assert replay.status_code == 401
    fresh = client.post("/api/auth/2fa/verify", json={"challenge": first["challenge"], "code": code_at(setup["secret"], step + 1)})
    assert fresh.status_code == 200 and "access_token" in fresh.get_json()
    assert client.post("/api/auth/2fa/verify", json={"challenge": "forged", "code": "123456"}).status_code == 401


def test_required_two_step_blocks_until_set_up(app, client, admin_headers):
    app.config["REQUIRE_2FA_ROLES"] = ("admin",)
    blocked = client.get("/api/students", headers=admin_headers)
    assert blocked.status_code == 403 and blocked.get_json()["two_factor_setup_required"] is True
    assert client.post("/api/auth/2fa/setup", headers=admin_headers).status_code == 200


def test_parents_cannot_set_fee_balance_or_ids(client, admin_headers):
    response = client.patch("/api/students/1", json={"fee_balance": 0, "id": 99}, headers=admin_headers)
    assert response.status_code == 400
    assert db.session.get(Student, 1).fee_balance == 5000


def test_driver_only_sees_own_route(client, driver_headers):
    names = {student["first_name"] for student in client.get("/api/students", headers=driver_headers).get_json()}
    assert names == {"Ethan"}


def test_security_headers_and_no_stack_traces(app, client):
    response = client.get("/api/health")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert "default-src 'none'" in response.headers["Content-Security-Policy"]
    assert response.headers["Cache-Control"] == "no-store"

    from app import create_app
    from app.config import TestConfig

    fresh = create_app(TestConfig)
    fresh.config.update(TESTING=False, PROPAGATE_EXCEPTIONS=False)

    @fresh.get("/api/explode")
    def explode():
        raise RuntimeError("database password is hunter2")

    crashed = fresh.test_client().get("/api/explode")
    assert crashed.status_code == 500 and "hunter2" not in crashed.get_data(as_text=True)


def test_other_sites_are_not_allowed_by_cors(client):
    response = client.get("/api/health", headers={"Origin": "https://evil.example"})
    assert "Access-Control-Allow-Origin" not in response.headers


def test_demo_prompts_only_to_approved_numbers(app, client, parent_headers, monkeypatch):
    from app.services import mpesa

    app.config.update(MPESA_CONSUMER_KEY="k", MPESA_CONSUMER_SECRET="s", MPESA_PASSKEY="p", MPESA_ALLOWED_PHONES=("0711000111",))
    monkeypatch.setattr(mpesa, "request_stk_push", lambda *args: {"checkout_id": "x", "simulated": False, "phone": "254700000003"})
    response = client.post("/api/payments/stk", json={"student_id": 1, "amount": 100, "phone": "0722999888"}, headers=parent_headers)
    assert response.status_code == 403


def test_long_passwords_are_refused_cheaply(client):
    assert login(client, "parent@test.com", "x" * 5000).status_code == 400


def test_fake_forwarded_for_cannot_dodge_limits(app):
    from app import create_app
    from app.config import TestConfig

    class Limited(TestConfig):
        RATELIMIT_ENABLED = True

    limited = create_app(Limited)
    with limited.app_context():
        db.create_all()
    client = limited.test_client()
    statuses = []
    for number in range(7):
        response = client.post("/api/auth/login", json={"email": "nobody@test.com", "password": "x"},
                               headers={"X-Forwarded-For": f"9.9.9.{number}, 41.90.1.1"})
        statuses.append(response.status_code)
    assert 429 in statuses
