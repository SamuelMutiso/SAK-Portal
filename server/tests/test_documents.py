from app.extensions import db
from app.models import Classroom, Student, StudentHistory


def test_parent_gets_own_child_documents(client, parent_headers, other_parent_headers):
    data = client.get("/api/students/1/documents", headers=parent_headers).get_json()
    assert data["student"]["admission_number"] == "A1"
    assert data["school"]["name"] == "Success Academy Kitengela"
    assert client.get("/api/students/1/documents", headers=other_parent_headers).status_code == 403


def test_pp2_learner_has_upcoming_graduation(app, client, admin_headers):
    pp2 = Classroom(name="PP2", level="Pre-Primary")
    db.session.add(pp2)
    student = db.session.get(Student, 2)
    student.classroom = pp2
    db.session.commit()
    keys = [item["key"] for item in client.get("/api/students/2/documents", headers=admin_headers).get_json()["completions"]]
    assert keys == ["pp2"]


def test_history_gives_past_certificates(app, client, admin_headers):
    db.session.add(StudentHistory(student_id=1, year=2023, classroom_name="PP2", outcome="promoted"))
    db.session.commit()
    completions = client.get("/api/students/1/documents", headers=admin_headers).get_json()["completions"]
    assert completions[0]["year"] == 2023 and completions[0]["upcoming"] is False


def test_class_batch_documents(client, admin_headers, parent_headers):
    data = client.get("/api/students/documents?classroom_id=1", headers=admin_headers).get_json()
    assert len(data["documents"]) >= 1
    assert client.get("/api/students/documents?classroom_id=1", headers=parent_headers).status_code == 403
