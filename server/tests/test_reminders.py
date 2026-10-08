from datetime import date, timedelta


def test_fee_reminder_goes_to_parents_with_balance(client, admin_headers):
    response = client.post("/api/fees/remind", json={}, headers=admin_headers)
    sms = response.get_json()["sms"]
    assert sms["sent"] == 1
    assert "KES 5,000" in sms["message"]
    assert "A1" in sms["message"]


def test_fee_list_only_admin(client, parent_headers):
    assert client.get("/api/fees", headers=parent_headers).status_code == 403


def test_event_created_with_notification(client, admin_headers):
    start = (date.today() + timedelta(days=3)).isoformat()
    payload = {"title": "Sports Day", "category": "sports", "start_date": start, "notify_parents": True}
    response = client.post("/api/events", json=payload, headers=admin_headers)
    data = response.get_json()
    assert response.status_code == 201
    assert data["sms"]["sent"] == 2
    assert "Sports Day" in data["sms"]["message"]


def test_cannot_remind_for_past_event(client, admin_headers):
    start = (date.today() - timedelta(days=3)).isoformat()
    event = client.post("/api/events", json={"title": "Old trip", "start_date": start}, headers=admin_headers).get_json()["event"]
    assert client.post(f"/api/events/{event['id']}/remind", headers=admin_headers).status_code == 400
