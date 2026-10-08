def test_teacher_saves_grade_sheet_with_levels(client, teacher_headers):
    payload = {"subject": "Mathematics", "term": "Term 3 2026", "exam": "End-Term", "scores": [{"student_id": 1, "score": 82}]}
    response = client.post("/api/assessments/sheet", json=payload, headers=teacher_headers)
    data = response.get_json()
    assert response.status_code == 201
    assert data[0]["score"] == 82
    assert data[0]["level"] == "EE"


def test_teacher_cannot_grade_other_class(client, teacher_headers):
    payload = {"subject": "Mathematics", "term": "Term 3 2026", "exam": "End-Term", "scores": [{"student_id": 2, "score": 60}]}
    response = client.post("/api/assessments/sheet", json=payload, headers=teacher_headers)
    assert response.get_json() == []


def test_parent_sees_child_grades(client, teacher_headers, parent_headers):
    payload = {"subject": "English", "term": "Term 3 2026", "exam": "Opener", "scores": [{"student_id": 1, "score": 48}]}
    client.post("/api/assessments/sheet", json=payload, headers=teacher_headers)
    records = client.get("/api/assessments/student/1", headers=parent_headers).get_json()
    assert records[0]["level"] == "AE"


def test_score_out_of_range_is_rejected(client, teacher_headers):
    payload = {"subject": "English", "term": "Term 3 2026", "exam": "Opener", "scores": [{"student_id": 1, "score": 120}]}
    assert client.post("/api/assessments/sheet", json=payload, headers=teacher_headers).status_code == 400
