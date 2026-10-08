def sheet(client, headers, subject, exam, score, reason=None, term="Term 3 2026"):
    entry = {"student_id": 1, "score": score}
    if reason:
        entry["reason"] = reason
    return client.post("/api/assessments/sheet", json={"subject": subject, "term": term, "exam": exam, "scores": [entry]}, headers=headers)


def test_changing_a_mark_needs_a_reason(client, teacher_headers):
    assert sheet(client, teacher_headers, "Mathematics", "Opener", 62).status_code == 201
    refused = sheet(client, teacher_headers, "Mathematics", "Opener", 80)
    assert refused.status_code == 400
    assert refused.get_json()["needs_reason"] == [1]
    assert sheet(client, teacher_headers, "Mathematics", "Opener", 80, "ok").status_code == 400
    assert sheet(client, teacher_headers, "Mathematics", "Opener", 80, "Missed a page when adding up").status_code == 201


def test_same_mark_saved_again_needs_no_reason(client, teacher_headers):
    sheet(client, teacher_headers, "English", "Opener", 55)
    assert sheet(client, teacher_headers, "English", "Opener", 55).status_code == 201


def test_mark_change_is_kept_with_reason(client, teacher_headers, admin_headers):
    sheet(client, teacher_headers, "Mathematics", "Opener", 62)
    sheet(client, teacher_headers, "Mathematics", "Opener", 70, "Re-marked question 4")
    changes = client.get("/api/assessments/changes", headers=admin_headers).get_json()
    assert changes[0]["old_score"] == 62
    assert changes[0]["new_score"] == 70
    assert changes[0]["reason"] == "Re-marked question 4"
    assert changes[0]["changed_by"] == "Teacher"


def test_parent_cannot_read_mark_changes(client, parent_headers):
    assert client.get("/api/assessments/changes", headers=parent_headers).status_code == 403


def test_class_insights_after_marks(client, teacher_headers):
    sheet(client, teacher_headers, "Mathematics", "Opener", 40)
    sheet(client, teacher_headers, "English", "Opener", 60)
    sheet(client, teacher_headers, "Mathematics", "Mid-Term", 20)
    sheet(client, teacher_headers, "English", "Mid-Term", 80)
    data = client.get("/api/insights/class", headers=teacher_headers).get_json()
    assert data["label"] == "T3 Mid-Term"
    assert data["exam_mean"] == 50
    assert data["best_subjects"][0]["subject"] == "English"
    assert data["weakest_subjects"][0]["subject"] == "Mathematics"
    assert data["failed"][0]["failed_subjects"][0]["subject"] == "Mathematics"
    assert data["term_mean"] == 50


def test_teacher_cannot_see_other_class_insights(client, teacher_headers):
    assert client.get("/api/insights/class?classroom_id=2", headers=teacher_headers).status_code == 403


def test_parent_sees_needs_improvement(client, teacher_headers, parent_headers):
    sheet(client, teacher_headers, "Mathematics", "Opener", 70)
    sheet(client, teacher_headers, "Mathematics", "Mid-Term", 45)
    data = client.get("/api/insights/student/1", headers=parent_headers).get_json()
    assert data["needs_improvement"][0]["subject"] == "Mathematics"
    assert any("Needs improvement in Mathematics" in line for line in data["headlines"])


def test_parent_cannot_see_other_child_insights(client, parent_headers):
    assert client.get("/api/insights/student/2", headers=parent_headers).status_code == 403


def test_admin_compares_classes(client, teacher_headers, admin_headers):
    sheet(client, teacher_headers, "Mathematics", "Opener", 70)
    client.post("/api/assessments/sheet", json={"subject": "Mathematics", "term": "Term 3 2026", "exam": "Opener", "scores": [{"student_id": 2, "score": 50}]}, headers=admin_headers)
    data = client.get("/api/insights/compare?classroom_ids=1,2", headers=admin_headers).get_json()
    assert [item["mean"] for item in data["classes"]] == [70, 50]
    assert data["common_subjects"] == ["Mathematics"]


def test_compare_needs_two_classes(client, admin_headers):
    assert client.get("/api/insights/compare?classroom_ids=1", headers=admin_headers).status_code == 400


def test_class_teacher_moves_learner_between_clubs(client, teacher_headers, admin_headers, app):
    from app.extensions import db
    from app.models import Club

    with app.app_context():
        db.session.add(Club(name="Music"))
        db.session.commit()
    mine = client.get("/api/clubs/class", headers=teacher_headers).get_json()
    assert mine["learners"][0]["club_ids"] == [1]
    moved = client.put("/api/clubs/learner/1", json={"club_ids": [2]}, headers=teacher_headers)
    assert moved.get_json()["club_ids"] == [2]
    music = client.get("/api/clubs/2", headers=admin_headers).get_json()
    assert music["members"][0]["first_name"] == "Ethan"


def test_class_teacher_cannot_move_other_class_learner(client, teacher_headers):
    assert client.put("/api/clubs/learner/2", json={"club_ids": [1]}, headers=teacher_headers).status_code == 403
    assert client.post("/api/clubs/1/members", json={"admission_number": "A2"}, headers=teacher_headers).status_code == 403


def test_class_teacher_removes_own_learner_from_club(client, teacher_headers):
    assert client.delete("/api/clubs/1/members/1", headers=teacher_headers).status_code == 204
    assert client.post("/api/clubs/1/members", json={"admission_number": "a1"}, headers=teacher_headers).status_code == 201
