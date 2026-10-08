import pytest

from app.extensions import db
from app.models import AuditLog, User


@pytest.fixture
def director_headers(client):
    director = User(full_name="Director", email="director@test.com", phone="0700000009", role="superadmin")
    director.set_password("password123")
    db.session.add(director)
    db.session.commit()
    response = client.post("/api/auth/login", json={"email": "director@test.com", "password": "password123"})
    return {"Authorization": f"Bearer {response.get_json()['access_token']}"}


def test_change_records_old_and_new_values(client, admin_headers, teacher_headers, director_headers):
    sheet = {"subject": "Mathematics", "term": "Term 3 2026", "exam": "End-Term", "scores": [{"student_id": 1, "score": 60}]}
    client.post("/api/assessments/sheet", json=sheet, headers=teacher_headers)
    sheet["scores"][0]["score"] = 95
    client.post("/api/assessments/sheet", json=sheet, headers=teacher_headers, environ_base={"REMOTE_ADDR": "105.160.1.20"})

    entries = client.get("/api/director/audit", query_string={"kind": "change"}, headers=director_headers).get_json()["entries"]
    latest = entries[0]
    assert latest["user_name"] == "Teacher"
    assert latest["action"] == "Saved a grade sheet"
    assert latest["ip_address"] == "105.160.1.20"
    assert latest["changes"][0]["fields"]["score"] == {"from": 60, "to": 95}


def test_failed_login_is_recorded(client, director_headers):
    client.post("/api/auth/login", json={"email": "admin@test.com", "password": "wrong"})
    entries = client.get("/api/director/audit?kind=login_failed", headers=director_headers).get_json()["entries"]
    assert entries[0]["user_name"] == "Admin"


def test_blocked_attempt_is_recorded(client, parent_headers, director_headers):
    client.post("/api/notices", json={"title": "Hack", "body": "Hack"}, headers=parent_headers)
    entries = client.get("/api/director/audit?kind=blocked", headers=director_headers).get_json()["entries"]
    assert entries[0]["user_role"] == "parent"


def test_device_is_described(client, admin_headers, director_headers):
    agent = "Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36"
    client.put("/api/timetable/class/1", json={"day": 0, "period": 1, "subject": "Games"}, headers={**admin_headers, "User-Agent": agent})
    entry = client.get("/api/director/audit?kind=change", headers=director_headers).get_json()["entries"][0]
    assert entry["device"] == "Android 13 phone (SM-A135F) · Chrome"
    assert entry["changes"][0]["item"] == "Grade 4, Monday lesson 1"


def test_only_director_can_read_audit(client, admin_headers):
    assert client.get("/api/director/audit", headers=admin_headers).status_code == 403


def test_chain_detects_tampering(client, admin_headers, director_headers):
    client.post("/api/notices", json={"title": "One", "body": "Two"}, headers=admin_headers)
    assert client.get("/api/director/verify", headers=director_headers).get_json()["ok"] is True
    entry = AuditLog.query.filter_by(kind="change").first()
    entry.user_name = "Someone else"
    db.session.commit()
    result = client.get("/api/director/verify", headers=director_headers).get_json()
    assert result["ok"] is False
    assert result["broken_at"] == entry.id


def test_admin_cannot_create_director(client, admin_headers):
    payload = {"full_name": "Fake", "email": "fake@test.com", "phone": "0700000010", "role": "superadmin", "password": "password123"}
    assert client.post("/api/users", json=payload, headers=admin_headers).status_code == 403


def test_switched_off_account_is_locked_out(client, teacher_headers, director_headers):
    client.patch("/api/director/staff/2", json={"is_active": False}, headers=director_headers)
    assert client.get("/api/auth/me", headers=teacher_headers).status_code == 401
    response = client.post("/api/auth/login", json={"email": "teacher@test.com", "password": "password123"})
    assert response.status_code == 401
