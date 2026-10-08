def test_club_notice_sends_sms_to_club_parents(client, admin_headers):
    payload = {"title": "Swimming", "body": "Bring costumes", "audience": "club", "club_id": 1, "send_sms": True}
    response = client.post("/api/notices", json=payload, headers=admin_headers)
    data = response.get_json()
    assert response.status_code == 201
    assert data["sms"]["sent"] == 1
    assert data["sms"]["recipients"] == ["+254700000003"]


def test_class_notice_requires_classroom(client, admin_headers):
    response = client.post("/api/notices", json={"title": "Meeting", "body": "Saturday", "audience": "class"}, headers=admin_headers)
    assert response.status_code == 400


def test_teacher_cannot_post_to_whole_school(client, teacher_headers):
    response = client.post("/api/notices", json={"title": "Hello", "body": "Everyone"}, headers=teacher_headers)
    assert response.status_code == 403


def test_parent_only_sees_relevant_notices(client, admin_headers, parent_headers):
    client.post("/api/notices", json={"title": "Grade 5 only", "body": "Trip", "audience": "class", "classroom_id": 2}, headers=admin_headers)
    client.post("/api/notices", json={"title": "Whole school", "body": "Sports day"}, headers=admin_headers)
    titles = [notice["title"] for notice in client.get("/api/notices", headers=parent_headers).get_json()]
    assert titles == ["Whole school"]


def test_parent_cannot_post_notice(client, parent_headers):
    response = client.post("/api/notices", json={"title": "Hi", "body": "Hi"}, headers=parent_headers)
    assert response.status_code == 403
