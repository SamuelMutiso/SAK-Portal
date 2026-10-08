import io

import pytest

from app.extensions import db
from app.models import Consent, User


def make_and_login(client, email, role, consent=True):
    from tests.conftest import accept_policies

    user = User(full_name=role.title(), email=email, phone="0700000011", role=role)
    user.set_password("password123")
    db.session.add(user)
    db.session.commit()
    if consent:
        accept_policies(user)
        db.session.commit()
    response = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    return user, {"Authorization": f"Bearer {response.get_json()['access_token']}"}, response.get_json()


@pytest.fixture
def director_headers(client):
    return make_and_login(client, "director@test.com", "director")[1]


@pytest.fixture
def owner_headers(client):
    return make_and_login(client, "owner@test.com", "superadmin")[1]


def test_director_can_read_admin_pages(client, director_headers):
    assert client.get("/api/students", headers=director_headers).status_code == 200
    assert client.get("/api/fees", headers=director_headers).status_code == 200
    assert client.get("/api/dashboard", headers=director_headers).status_code == 200
    assert client.get("/api/reports/student/1", headers=director_headers).status_code == 200


def test_director_cannot_change_anything(client, director_headers):
    assert client.post("/api/notices", json={"title": "Hi", "body": "There"}, headers=director_headers).status_code == 403
    assert client.put("/api/timetable/class/1", json={"day": 0, "period": 1, "subject": "Games"}, headers=director_headers).status_code == 403


def test_director_cannot_read_audit(client, director_headers):
    assert client.get("/api/owner/audit", headers=director_headers).status_code == 403


def test_performance_analytics(client, teacher_headers, director_headers):
    for term, score in (("Term 1 2026", 40), ("Term 3 2026", 80)):
        sheet = {"subject": "Mathematics", "term": term, "exam": "End-Term", "scores": [{"student_id": 1, "score": score}]}
        client.post("/api/assessments/sheet", json=sheet, headers=teacher_headers)
    data = client.get("/api/analytics/performance", headers=director_headers).get_json()
    grade4 = data["classes"][0]
    assert grade4["top"][0]["full_name"] == "Ethan M"
    assert grade4["most_improved"][0]["change"] == 40


def test_new_user_must_accept_policies(client):
    user, headers, login = make_and_login(client, "new@test.com", "teacher", consent=False)
    assert login["user"]["consent_required"] is True
    blocked = client.get("/api/students", headers=headers)
    assert blocked.status_code == 403
    assert blocked.get_json()["consent_required"] is True
    response = client.post("/api/consent", json={"accept_terms": True, "accept_privacy": True, "signature": "Teacher"}, headers=headers)
    assert response.status_code == 201
    assert client.get("/api/students", headers=headers).status_code == 200


def test_parent_must_allow_child_data(client):
    user, headers, _ = make_and_login(client, "p2@test.com", "parent", consent=False)
    payload = {"accept_terms": True, "accept_privacy": True, "signature": "Parent Two"}
    assert client.post("/api/consent", json=payload, headers=headers).status_code == 400
    payload["child_data"] = True
    assert client.post("/api/consent", json=payload, headers=headers).status_code == 201


def test_no_photo_consent_blocks_portfolio_upload(client, teacher_headers):
    parent = User.query.filter_by(email="parent@test.com").first()
    parent.photo_consent = False
    db.session.commit()
    data = {"student_id": "1", "title": "Pot", "learning_area": "Creative Arts", "image": (io.BytesIO(b"x"), "pot.jpg")}
    response = client.post("/api/portfolio", data=data, headers=teacher_headers, content_type="multipart/form-data")
    assert response.status_code == 403


def test_owner_removes_parent_account(client, owner_headers):
    parent = User.query.filter_by(email="other@test.com").first()
    assert client.delete(f"/api/owner/accounts/{parent.id}", headers=owner_headers).status_code == 200
    login = client.post("/api/auth/login", json={"email": "other@test.com", "password": "password123"})
    assert login.status_code == 401


def test_owner_creates_director(client, owner_headers):
    payload = {"full_name": "New Director", "email": "nd@test.com", "phone": "0700000012", "role": "director", "password": "password123"}
    assert client.post("/api/owner/accounts", json=payload, headers=owner_headers).status_code == 201


def test_admin_cannot_change_director(client, admin_headers, director_headers):
    director = User.query.filter_by(email="director@test.com").first()
    assert client.patch(f"/api/users/{director.id}", json={"is_active": False}, headers=admin_headers).status_code == 403
