import requests

from app.models import SmsMessage, User
from app.services import sms
from app.services.sms import send_sms


def login(client, email):
    return {"Authorization": f"Bearer {client.post('/api/auth/login', json={'email': email, 'password': 'password123'}).get_json()['access_token']}"}


class Reply:
    def raise_for_status(self):
        pass


def use_textbee(app, monkeypatch, phones="0700000003", limit=50):
    app.config.update(TEXTBEE_API_KEY="tb-key", TEXTBEE_DEVICE_ID="phone-1", SMS_LIVE_PHONES=phones, SMS_DAILY_LIMIT=limit)
    calls = []

    def fake_post(url, json=None, headers=None, timeout=None, **kwargs):
        calls.append({"url": url, "json": json, "headers": headers})
        return Reply()

    monkeypatch.setattr(sms.requests, "post", fake_post)
    return calls


def test_preview_is_logged_without_a_gateway(app):
    result = send_sms(["0700000003", "0700000004"], "Closing day is tomorrow.")
    assert result["mode"] == "preview" and result["sent"] == 2 and result["delivered"] == 0
    assert {item.status for item in SmsMessage.query.all()} == {"preview"}


def test_textbee_sends_only_to_live_numbers(app, monkeypatch):
    calls = use_textbee(app, monkeypatch)
    result = send_sms(["0700000003", "0700000004"], "Ethan's fee balance is KES 18,330.")
    assert result["mode"] == "live" and result["delivered"] == 1
    assert calls[0]["url"] == sms.TEXTBEE_URL and calls[0]["headers"]["x-api-key"] == "tb-key"
    assert calls[0]["json"] == {"recipients": ["+254700000003"], "message": "Ethan's fee balance is KES 18,330.", "deviceId": "phone-1"}
    statuses = {item.phone: item.status for item in SmsMessage.query.all()}
    assert statuses == {"+254700000003": "sent", "+254700000004": "preview"}


def test_daily_limit_and_failures(app, monkeypatch):
    use_textbee(app, monkeypatch, phones="*", limit=2)
    send_sms(["0700000001", "0700000002", "0700000003"], "Reminder")
    assert sorted(item.status for item in SmsMessage.query.all()) == ["sent", "sent", "skipped"]

    def broken(*args, **kwargs):
        raise requests.ConnectionError()

    app.config["SMS_DAILY_LIMIT"] = 50
    monkeypatch.setattr(sms.requests, "post", broken)
    result = send_sms(["0700000004"], "Reminder")
    assert result["mode"] == "preview"
    failed = SmsMessage.query.filter_by(status="failed").one()
    assert failed.error == "The SMS phone did not answer"


def test_reset_code_is_hidden_in_the_log(client, app, monkeypatch):
    use_textbee(app, monkeypatch)
    client.post("/api/auth/forgot", json={"login": "parent@test.com"})
    logged = SmsMessage.query.one()
    assert "••••••" in logged.message and not any(char.isdigit() for char in logged.message.split("code is")[1][:8])


def test_outbox_and_test_message(client, app, monkeypatch):
    calls = use_textbee(app, monkeypatch)
    send_sms(["0700000003"], "Closing day is tomorrow.")
    admin = login(client, "admin@test.com")
    data = client.get("/api/sms", headers=admin).get_json()
    assert data["status"] == {"provider": "textbee", "everyone": False, "live_phones": ["+254700000003"], "sent_today": 1, "daily_limit": 50}
    assert data["messages"][0]["name"] == User.query.filter_by(phone="0700000003").one().full_name
    assert client.get("/api/sms?status=failed", headers=admin).get_json()["messages"] == []
    assert client.get("/api/sms", headers=login(client, "parent@test.com")).status_code == 403
    assert client.post("/api/sms/test", json={"phone": "12345"}, headers=admin).status_code == 400
    sent = client.post("/api/sms/test", json={"phone": "0700 000 003"}, headers=admin).get_json()
    assert sent["status"] == "sent" and len(calls) == 2
    other = client.post("/api/sms/test", json={"phone": "0799999999"}, headers=admin).get_json()
    assert other["status"] == "preview" and len(calls) == 2
