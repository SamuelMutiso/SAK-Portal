def test_admin_sees_all_students(client, admin_headers):
    response = client.get("/api/students", headers=admin_headers)
    assert len(response.get_json()) == 2


def test_teacher_sees_only_their_class(client, teacher_headers):
    students = client.get("/api/students", headers=teacher_headers).get_json()
    assert [student["first_name"] for student in students] == ["Ethan"]


def test_parent_sees_only_their_child(client, parent_headers):
    students = client.get("/api/students", headers=parent_headers).get_json()
    assert [student["first_name"] for student in students] == ["Ethan"]


def test_parent_cannot_open_other_child(client, parent_headers):
    assert client.get("/api/students/2", headers=parent_headers).status_code == 403


def test_admin_creates_student(client, admin_headers):
    payload = {"admission_number": "A3", "first_name": "Neema", "last_name": "W", "classroom_id": 1}
    response = client.post("/api/students", json=payload, headers=admin_headers)
    assert response.status_code == 201
    assert response.get_json()["classroom_name"] == "Grade 4"
