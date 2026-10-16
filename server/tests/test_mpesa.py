from datetime import datetime, timedelta

import pytest

from app.extensions import db
from app.models import Payment, Student
from app.services import ledger, mpesa
from app.services.mpesa import callback_token


class FakeResponse:
    def __init__(self, status, data):
        self.status_code = status
        self.data = data
        self.headers = {"Content-Type": "application/json"}

    def json(self):
        return self.data


@pytest.fixture
def live(app, monkeypatch):
    app.config.update(MPESA_CONSUMER_KEY="key", MPESA_CONSUMER_SECRET="secret", MPESA_PASSKEY="pass",
                      MPESA_CALLBACK_URL="https://api.test/api/payments/callback")
    mpesa._token.update(value=None, expires=0)
    from app.routes import payments
    payments.last_checked.clear()
    calls = []
    replies = {}

    def fake_get(url, **kwargs):
        return FakeResponse(200, {"access_token": "abc", "expires_in": "3599"})

    def fake_post(url, json=None, **kwargs):
        calls.append((url, json))
        for path, reply in replies.items():
            if url.endswith(path):
                return reply
        return FakeResponse(500, {})

    monkeypatch.setattr(mpesa.requests, "get", fake_get)
    monkeypatch.setattr(mpesa.requests, "post", fake_post)
    return {"calls": calls, "replies": replies}


@pytest.fixture
def owing(app):
    student = db.session.get(Student, 1)
    ledger.create_invoice(student, "Term 3 2026", lines=[{"description": "Tuition", "category": "tuition", "amount": 5000}])
    ledger.refresh(student)
    db.session.commit()
    return student


def stk_ok(checkout="ws_CO_9"):
    return FakeResponse(200, {"ResponseCode": "0", "CheckoutRequestID": checkout, "CustomerMessage": "Success"})


def test_stk_push_sends_signed_callback_and_stays_pending(client, parent_headers, live, owing):
    live["replies"]["processrequest"] = stk_ok()
    response = client.post("/api/payments/stk", json={"student_id": 1, "amount": 2000, "phone": "0712 345 678"}, headers=parent_headers)
    assert response.status_code == 201
    assert response.get_json()["payment"]["status"] == "pending"
    sent = live["calls"][0][1]
    assert sent["PhoneNumber"] == "254712345678"
    assert sent["CallBackURL"].endswith(f"?token={callback_token()}")


def test_daraja_rejection_shows_message(client, parent_headers, live, owing):
    live["replies"]["processrequest"] = FakeResponse(400, {"errorMessage": "Invalid Access Token"})
    response = client.post("/api/payments/stk", json={"student_id": 1, "amount": 2000, "phone": "0712345678"}, headers=parent_headers)
    assert response.status_code == 502
    assert response.get_json()["error"] == "Invalid Access Token"
    assert Payment.query.count() == 0


def test_non_safaricom_number_rejected(client, parent_headers, live, owing):
    response = client.post("/api/payments/stk", json={"student_id": 1, "amount": 2000, "phone": "0612345678"}, headers=parent_headers)
    assert response.status_code == 400


def test_callback_without_token_is_refused(client, owing):
    db.session.add(Payment(student_id=1, amount=1000, phone="254700000003", checkout_id="ws_CO_2"))
    db.session.commit()
    body = {"Body": {"stkCallback": {"CheckoutRequestID": "ws_CO_2", "ResultCode": 0, "CallbackMetadata": {"Item": []}}}}
    assert client.post("/api/payments/callback", json=body).status_code == 403
    assert client.post("/api/payments/callback?token=wrong", json=body).status_code == 403
    assert Payment.query.filter_by(checkout_id="ws_CO_2").first().status == "pending"


def test_cancelled_prompt_marks_failed_with_reason(client, owing):
    db.session.add(Payment(student_id=1, amount=1000, phone="254700000003", checkout_id="ws_CO_3"))
    db.session.commit()
    body = {"Body": {"stkCallback": {"CheckoutRequestID": "ws_CO_3", "ResultCode": 1032, "ResultDesc": "Request cancelled by user"}}}
    client.post(f"/api/payments/callback?token={callback_token()}", json=body)
    payment = Payment.query.filter_by(checkout_id="ws_CO_3").first()
    assert payment.status == "failed"
    assert "cancelled" in payment.note


def test_status_check_completes_when_callback_is_lost(client, parent_headers, live, owing):
    payment = Payment(student_id=1, amount=2000, phone="254700000003", checkout_id="ws_CO_4", created_at=datetime.utcnow() - timedelta(seconds=30))
    db.session.add(payment)
    db.session.commit()
    live["replies"]["query"] = FakeResponse(200, {"ResultCode": "0", "ResultDesc": "The service request is processed successfully."})
    data = client.get(f"/api/payments/{payment.id}", headers=parent_headers).get_json()
    assert data["status"] == "completed"
    assert data["receipt_number"].startswith("RCP-")
    assert db.session.get(Student, 1).fee_balance == 3000

    body = {"Body": {"stkCallback": {"CheckoutRequestID": "ws_CO_4", "ResultCode": 0,
                                     "CallbackMetadata": {"Item": [{"Name": "MpesaReceiptNumber", "Value": "TJK1234XYZ"}]}}}}
    client.post(f"/api/payments/callback?token={callback_token()}", json=body)
    payment = db.session.get(Payment, payment.id)
    assert payment.receipt == "TJK1234XYZ"
    assert db.session.get(Student, 1).fee_balance == 3000


def test_status_check_reports_wrong_pin(client, parent_headers, live, owing):
    payment = Payment(student_id=1, amount=2000, phone="254700000003", checkout_id="ws_CO_5", created_at=datetime.utcnow() - timedelta(seconds=30))
    db.session.add(payment)
    db.session.commit()
    live["replies"]["query"] = FakeResponse(200, {"ResultCode": "2001", "ResultDesc": "The initiator information is invalid."})
    data = client.get(f"/api/payments/{payment.id}", headers=parent_headers).get_json()
    assert data["status"] == "failed"
    assert data["note"] == "The M-Pesa PIN was wrong. Please try again."


def test_late_success_recovers_a_failed_payment(client, owing):
    db.session.add(Payment(student_id=1, amount=1000, phone="254700000003", checkout_id="ws_CO_6", status="failed", note="No answer"))
    db.session.commit()
    body = {"Body": {"stkCallback": {"CheckoutRequestID": "ws_CO_6", "ResultCode": 0,
                                     "CallbackMetadata": {"Item": [{"Name": "MpesaReceiptNumber", "Value": "TJK9"}]}}}}
    client.post(f"/api/payments/callback?token={callback_token()}", json=body)
    assert Payment.query.filter_by(checkout_id="ws_CO_6").first().status == "completed"
    assert db.session.get(Student, 1).fee_balance == 4000


def test_inactive_number_gets_plain_message(client, owing):
    db.session.add(Payment(student_id=1, amount=1000, phone="254700000003", checkout_id="ws_CO_7"))
    db.session.commit()
    body = {"Body": {"stkCallback": {"CheckoutRequestID": "ws_CO_7", "ResultCode": 2028, "ResultDesc": "The DebitParty is in an invalid state."}}}
    client.post(f"/api/payments/callback?token={callback_token()}", json=body)
    assert Payment.query.filter_by(checkout_id="ws_CO_7").first().note.startswith("That number is not an active M-Pesa line")


def test_office_prompt_records_who_sent_it(client, admin_headers, live, owing):
    live["replies"]["processrequest"] = stk_ok("ws_CO_8")
    client.post("/api/payments/stk", json={"student_id": 1, "amount": 500, "phone": "0712345678"}, headers=admin_headers)
    assert Payment.query.filter_by(checkout_id="ws_CO_8").first().recorded_by.role == "admin"
