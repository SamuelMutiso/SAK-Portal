import re

from app.extensions import db
from app.models import User


def login(client, name, password):
    return client.post("/api/auth/login", json={"email": name, "password": password})


def test_sign_in_with_phone_number(client):
    response = login(client, "0700 000 003", "password123")
    assert response.status_code == 200
    assert response.get_json()["user"]["role"] == "parent"


def test_sign_in_with_international_phone(client):
    assert login(client, "+254700000003", "password123").status_code == 200


def test_wrong_password_fails(client):
    assert login(client, "0700000003", "wrong").status_code == 401


def test_new_parent_must_change_password(client, admin_headers):
    payload = {"first_name": "Baraka", "last_name": "Otieno", "gender": "Male", "date_of_birth": "2018-04-02", "classroom_id": 1,
               "guardian": {"full_name": "Rose Otieno", "phone": "0711222333", "relationship": "Mother"}}
    temporary = client.post("/api/students/admit", json=payload, headers=admin_headers).get_json()["temporary_password"]
    data = login(client, "0711222333", temporary).get_json()
    assert data["user"]["must_change_password"] is True
    headers = {"Authorization": f"Bearer {data['access_token']}"}
    client.post("/api/consent", json={"accept_terms": True, "accept_privacy": True, "child_data": True, "signature": "Rose Otieno"}, headers=headers)
    blocked = client.get("/api/students", headers=headers)
    assert blocked.status_code == 403 and blocked.get_json()["password_change_required"] is True
    weak = client.post("/api/auth/change-password", json={"current_password": temporary, "new_password": "short"}, headers=headers)
    assert weak.status_code == 400
    done = client.post("/api/auth/change-password", json={"current_password": temporary, "new_password": "Kitengela2026"}, headers=headers)
    assert done.get_json()["user"]["must_change_password"] is False
    assert client.get("/api/students", headers=headers).status_code == 401
    fresh = {"Authorization": f"Bearer {done.get_json()['access_token']}"}
    assert client.get("/api/students", headers=fresh).status_code == 200


def test_forgot_and_reset_with_sms_code(app, client):
    app.config["DEMO_MODE"] = True
    sent = client.post("/api/auth/forgot", json={"login": "0700000003"}).get_json()
    code = re.search(r"\b(\d{6})\b", sent["sms"]["message"]).group(1)
    assert client.post("/api/auth/reset", json={"login": "0700000003", "code": "000000" if code != "000000" else "111111", "new_password": "NewPass2026"}).status_code == 400
    assert client.post("/api/auth/reset", json={"login": "0700000003", "code": code, "new_password": "NewPass2026"}).status_code == 200
    assert login(client, "parent@test.com", "NewPass2026").status_code == 200
    assert client.post("/api/auth/reset", json={"login": "0700000003", "code": code, "new_password": "Again2026x"}).status_code == 400


def test_forgot_does_not_reveal_unknown_accounts(client):
    response = client.post("/api/auth/forgot", json={"login": "0799999999"})
    assert response.status_code == 200
    assert "sms" not in response.get_json()


def test_reset_code_locks_after_five_tries(client):
    client.post("/api/auth/forgot", json={"login": "parent@test.com"})
    for _ in range(5):
        client.post("/api/auth/reset", json={"login": "parent@test.com", "code": "999999", "new_password": "NewPass2026"})
    user = User.query.filter_by(email="parent@test.com").first()
    assert user.check_password("password123")
    assert db.session.query(User).count() > 0


def test_reset_code_never_returned_outside_demo(client):
    sent = client.post("/api/auth/forgot", json={"login": "0700000003"}).get_json()
    assert "sms" not in sent and "code" not in str(sent).lower().replace("6-digit code", "")
