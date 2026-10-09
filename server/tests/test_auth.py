def test_login_returns_tokens(client):
    response = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "password123"})
    data = response.get_json()
    assert response.status_code == 200
    assert data["access_token"]
    assert data["user"]["role"] == "admin"
    assert "password_hash" not in data["user"]


def test_login_rejects_wrong_password(client):
    response = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "wrong"})
    assert response.status_code == 401


def test_me_requires_token(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_returns_current_user(client, parent_headers):
    response = client.get("/api/auth/me", headers=parent_headers)
    assert response.get_json()["email"] == "parent@test.com"


def test_parent_cannot_list_users(client, parent_headers):
    assert client.get("/api/users", headers=parent_headers).status_code == 403


def test_login_with_wrong_role_is_refused(client):
    response = client.post("/api/auth/login", json={"email": "parent@test.com", "password": "password123", "role": "teacher"})
    assert response.status_code == 401
    assert "Parent account" in response.get_json()["error"]


def test_login_with_right_role(client):
    response = client.post("/api/auth/login", json={"email": "parent@test.com", "password": "password123", "role": "parent"})
    assert response.status_code == 200


def test_demo_mode_asks_parent_for_consent_every_sign_in(app, client):
    app.config["DEMO_MODE"] = True
    first = client.post("/api/auth/login", json={"email": "parent@test.com", "password": "password123"}).get_json()
    assert first["user"]["consent_required"] is True
    teacher = client.post("/api/auth/login", json={"email": "teacher@test.com", "password": "password123"}).get_json()
    assert teacher["user"]["consent_required"] is False


def test_consent_is_kept_without_demo_mode(app, client):
    app.config["DEMO_MODE"] = False
    data = client.post("/api/auth/login", json={"email": "parent@test.com", "password": "password123"}).get_json()
    assert data["user"]["consent_required"] is False
