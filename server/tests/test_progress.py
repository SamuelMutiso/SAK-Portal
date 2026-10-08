def test_trend_spans_terms(client, teacher_headers, parent_headers):
    for term, score in (("Term 1 2026", 50), ("Term 2 2026", 70)):
        payload = {"subject": "Mathematics", "term": term, "exam": "End-Term", "scores": [{"student_id": 1, "score": score}]}
        client.post("/api/assessments/sheet", json=payload, headers=teacher_headers)
    trend = client.get("/api/reports/student/1/trend", headers=parent_headers).get_json()
    maths = next(subject for subject in trend["subjects"] if subject["name"] == "Mathematics")
    assert [point["label"] for point in maths["points"]] == ["T1 End-Term", "T2 End-Term"]
    assert maths["change"] == 20


def test_class_trend_for_teacher(client, teacher_headers):
    payload = {"subject": "English", "term": "Term 1 2026", "exam": "Opener", "scores": [{"student_id": 1, "score": 60}]}
    client.post("/api/assessments/sheet", json=payload, headers=teacher_headers)
    data = client.get("/api/reports/class-trend", headers=teacher_headers).get_json()
    assert data["overall"][0]["value"] == 60


def test_report_for_earlier_term(client, teacher_headers, parent_headers):
    client.put("/api/reports/student/1?term=Term 1 2026", json={"teacher_comment": "Strong start"}, headers=teacher_headers)
    report = client.get("/api/reports/student/1?term=Term 1 2026", headers=parent_headers).get_json()
    assert report["term"] == "Term 1 2026"
    assert report["report"]["teacher_comment"] == "Strong start"


def test_club_detail_and_activity(client, admin_headers):
    detail = client.get("/api/clubs/1", headers=admin_headers).get_json()
    assert detail["club"]["name"] == "Swimming"
    assert detail["members"][0]["first_name"] == "Ethan"
    activity = client.post("/api/clubs/1/activities", json={"title": "Gala practice", "date": "2026-10-20"}, headers=admin_headers)
    assert activity.status_code == 201
    assert client.patch("/api/clubs/1", json={"leader_id": 1}, headers=admin_headers).get_json()["leader_name"] == "Ethan M"


def test_leader_must_be_member(client, admin_headers):
    assert client.patch("/api/clubs/1", json={"leader_id": 2}, headers=admin_headers).status_code == 400


def test_teacher_who_is_not_patron_cannot_edit_club(client, teacher_headers):
    assert client.post("/api/clubs/1/activities", json={"title": "Practice", "date": "2026-10-20"}, headers=teacher_headers).status_code == 403


def test_admin_sets_timetable_and_parent_sees_it(client, admin_headers, parent_headers):
    client.put("/api/timetable/class/1", json={"day": 0, "period": 1, "subject": "Mathematics"}, headers=admin_headers)
    timetable = client.get("/api/timetable/student/1", headers=parent_headers).get_json()
    assert timetable["slots"][0]["subject"] == "Mathematics"
    assert "Science and Technology" in timetable["subjects"]


def test_parent_cannot_see_other_class_timetable(client, parent_headers):
    assert client.get("/api/timetable/student/2", headers=parent_headers).status_code == 403
