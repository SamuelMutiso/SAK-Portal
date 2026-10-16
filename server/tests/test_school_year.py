from datetime import date

from app.extensions import db
from app.models import SchoolTerm, Student


def admission(**overrides):
    payload = {
        "first_name": "Baraka", "last_name": "Otieno", "gender": "Male", "date_of_birth": "2018-04-02",
        "classroom_id": 1, "guardian": {"full_name": "Rose Otieno", "phone": "0711222333", "relationship": "Mother"},
        "allergies": "Peanuts",
    }
    payload.update(overrides)
    return payload


def test_admission_creates_parent_and_number(client, admin_headers):
    response = client.post("/api/students/admit", json=admission(), headers=admin_headers)
    data = response.get_json()
    assert response.status_code == 201
    assert data["student"]["admission_number"].startswith("SAK-")
    assert data["parent"]["is_new"] is True
    assert data["temporary_password"].startswith("SA-")
    assert "allergies" not in data["student"]


def test_sibling_shares_parent_account(client, admin_headers):
    client.post("/api/students/admit", json=admission(), headers=admin_headers)
    second = client.post("/api/students/admit", json=admission(first_name="Zuri", gender="Female", guardian={"full_name": "Rose Otieno", "phone": "+254711222333"}), headers=admin_headers).get_json()
    assert second["parent"]["is_new"] is False
    assert second["parent"]["children"] == 2
    assert second["temporary_password"] is None


def test_admission_numbers_count_up(client, admin_headers):
    first = client.post("/api/students/admit", json=admission(), headers=admin_headers).get_json()["student"]["admission_number"]
    second = client.post("/api/students/admit", json=admission(first_name="Zuri", gender="Female"), headers=admin_headers).get_json()["student"]["admission_number"]
    assert int(second[-4:]) == int(first[-4:]) + 1


def test_bad_phone_is_refused(client, admin_headers):
    response = client.post("/api/students/admit", json=admission(guardian={"full_name": "Rose Otieno", "phone": "12345"}), headers=admin_headers)
    assert response.status_code == 400


def test_health_is_private(client, admin_headers, teacher_headers, app):
    with app.app_context():
        client.post("/api/students/admit", json=admission(classroom_id=2), headers=admin_headers)
    student_id = Student.query.filter_by(first_name="Baraka").first().id
    assert client.get(f"/api/students/{student_id}/profile", headers=admin_headers).get_json()["health"]["allergies"] == "Peanuts"
    assert client.get(f"/api/students/{student_id}/profile", headers=teacher_headers).status_code == 403


def test_class_teacher_sees_health(client, admin_headers, teacher_headers):
    client.post("/api/students/admit", json=admission(), headers=admin_headers)
    student_id = Student.query.filter_by(first_name="Baraka").first().id
    assert client.get(f"/api/students/{student_id}/profile", headers=teacher_headers).get_json()["health"]["allergies"] == "Peanuts"


def test_leaving_keeps_the_record(client, admin_headers):
    response = client.post("/api/students/1/leave", json={"status": "transferred", "reason": "Family moved to Nakuru"}, headers=admin_headers)
    assert response.get_json()["status"] == "transferred"
    current = client.get("/api/students", headers=admin_headers).get_json()
    former = client.get("/api/students?status=former", headers=admin_headers).get_json()
    assert [item["id"] for item in current] == [2]
    assert former[0]["last_classroom_name"] == "Grade 4"
    profile = client.get("/api/students/1/profile", headers=admin_headers).get_json()
    assert profile["history"][0]["outcome"] == "transferred"


def test_delete_only_withdraws(client, admin_headers):
    assert client.delete("/api/students/1", headers=admin_headers).status_code == 204
    assert db.session.get(Student, 1).status == "withdrawn"


def test_readmit(client, admin_headers):
    client.post("/api/students/1/leave", json={"status": "withdrawn", "reason": "Fees arrears for a term"}, headers=admin_headers)
    response = client.post("/api/students/1/readmit", json={"classroom_id": 1}, headers=admin_headers)
    assert response.get_json()["status"] == "active"


def test_promotion_moves_everyone_up(client, admin_headers):
    preview = client.get("/api/school-year/promotion?from_year=2026", headers=admin_headers).get_json()
    assert [row["next"] for row in preview["rows"]] == ["Grade 5", None]
    run = client.post("/api/school-year/promotion", json={"from_year": 2026, "start_next_year": False}, headers=admin_headers).get_json()
    assert run["promoted"] == 1 and run["completed"] == 1
    ethan = db.session.get(Student, 1)
    assert ethan.classroom.name == "Grade 5"
    assert db.session.get(Student, 2).status == "completed"


def test_promotion_can_hold_a_learner_back(client, admin_headers):
    client.post("/api/school-year/promotion", json={"from_year": 2026, "hold_back": [1], "start_next_year": False}, headers=admin_headers)
    ethan = db.session.get(Student, 1)
    assert ethan.classroom.name == "Grade 4"
    assert ethan.history[0].outcome == "repeated"


def test_promotion_runs_once_per_year(client, admin_headers):
    client.post("/api/school-year/promotion", json={"from_year": 2026, "start_next_year": False}, headers=admin_headers)
    again = client.post("/api/school-year/promotion", json={"from_year": 2026, "start_next_year": False}, headers=admin_headers)
    assert again.status_code == 400


def test_teacher_cannot_promote(client, teacher_headers):
    assert client.post("/api/school-year/promotion", json={"from_year": 2026}, headers=teacher_headers).status_code == 403


def test_current_term_follows_the_office(client, admin_headers, app):
    with app.app_context():
        db.session.add_all([
            SchoolTerm(name="Term 3 2026", year=2026, number=3, start_date=date(2026, 8, 24), end_date=date(2026, 10, 30)),
            SchoolTerm(name="Term 1 2027", year=2027, number=1, start_date=date(2027, 1, 5), end_date=date(2027, 4, 2)),
        ])
        db.session.commit()
    terms = client.get("/api/school-year/terms", headers=admin_headers).get_json()["terms"]
    later = next(term for term in terms if term["name"] == "Term 1 2027")
    client.post(f"/api/school-year/terms/{later['id']}/current", headers=admin_headers)
    assert client.get("/api/meta", headers=admin_headers).get_json()["term"] == "Term 1 2027"


def test_term_dates_must_make_sense(client, admin_headers, app):
    with app.app_context():
        db.session.add(SchoolTerm(name="Term 1 2026", year=2026, number=1))
        db.session.commit()
    term_id = SchoolTerm.query.first().id
    response = client.patch(f"/api/school-year/terms/{term_id}", json={"start_date": "2026-04-01", "end_date": "2026-01-05"}, headers=admin_headers)
    assert response.status_code == 400


def test_past_year_insights_follow_history(client, admin_headers, teacher_headers):
    sheet = {"subject": "Mathematics", "term": "Term 3 2026", "exam": "End-Term", "scores": [{"student_id": 1, "score": 80}]}
    client.post("/api/assessments/sheet", json=sheet, headers=teacher_headers)
    client.post("/api/school-year/promotion", json={"from_year": 2026, "start_next_year": False}, headers=admin_headers)
    data = client.get("/api/insights/class?classroom_id=1&term=Term 3 2026&exam=End-Term", headers=admin_headers).get_json()
    assert data["top"][0]["full_name"] == "Ethan M"
