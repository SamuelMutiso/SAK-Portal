from datetime import datetime, timedelta

import pytest

from app.extensions import db
from app.models import Payment, Student, TransportRoute
from app.services import ledger
from app.services.mpesa import callback_token
from tests.conftest import login


@pytest.fixture
def owing(app):
    student = db.session.get(Student, 1)
    ledger.create_invoice(student, "Term 3 2026", lines=[{"description": "Tuition", "category": "tuition", "amount": 5000}])
    ledger.refresh(student)
    db.session.commit()
    return student


def callback(client, checkout, code, receipt="QWE123"):
    items = [{"Name": "Amount", "Value": 1000}, {"Name": "MpesaReceiptNumber", "Value": receipt}]
    body = {"Body": {"stkCallback": {"CheckoutRequestID": checkout, "ResultCode": code, "ResultDesc": "done",
                                     **({"CallbackMetadata": {"Item": items}} if code == 0 else {})}}}
    client.post(f"/api/payments/callback?token={callback_token()}", json=body)


def test_receipt_only_for_successful_payment_and_sms_links_to_it(client, owing, parent_headers, monkeypatch):
    sent = []
    monkeypatch.setattr("app.routes.payments.send_sms", lambda phones, message: sent.append(message) or {"sent": 1})
    db.session.add_all([Payment(student_id=1, amount=1000, phone="254700000003", checkout_id="ws_ok"),
                        Payment(student_id=1, amount=1000, phone="254700000003", checkout_id="ws_bad"),
                        Payment(student_id=1, amount=1000, phone="254700000003", checkout_id="ws_wait")])
    db.session.commit()
    callback(client, "ws_ok", 0)
    callback(client, "ws_bad", 1032)
    ok, bad, wait = (Payment.query.filter_by(checkout_id=key).first() for key in ("ws_ok", "ws_bad", "ws_wait"))
    receipt = client.get(f"/api/fees/payments/{ok.id}", headers=parent_headers)
    assert receipt.status_code == 200 and receipt.get_json()["payment"]["receipt_number"]
    assert client.get(f"/api/fees/payments/{bad.id}", headers=parent_headers).status_code == 404
    assert client.get(f"/api/fees/payments/{wait.id}", headers=parent_headers).status_code == 404
    assert len(sent) == 1 and "M-Pesa QWE123" in sent[0] and f"/parent/receipts/{ok.id}" in sent[0]
    assert client.get(f"/api/fees/payments/{ok.id}", headers=login(client, "other@test.com")).status_code == 403


def test_driver_shares_location_and_parent_sees_the_bus(client, app, driver_headers, parent_headers):
    assert client.post("/api/trips/location", json={"lat": 51.5, "lng": -0.1}, headers=driver_headers).status_code == 400
    assert client.post("/api/trips/location", json={"lat": -1.47, "lng": 36.96}, headers=driver_headers).status_code == 200
    route = TransportRoute.query.first()
    route.stops = [{"name": "Success Academy", "lat": -1.4805, "lng": 36.9585}, {"name": "Yukos", "lat": -1.452, "lng": 36.969}]
    db.session.get(Student, 1).transport_stop = "Yukos"
    db.session.commit()
    live = client.get(f"/api/trips/live/{route.id}", headers=parent_headers).get_json()
    assert live["live"] and live["lat"] == -1.47 and live["eta"][0]["to"] == "Yukos" and live["eta"][0]["minutes"] >= 1
    assert client.get(f"/api/trips/live/{route.id}", headers=login(client, "other@test.com")).status_code == 403
    assert client.get(f"/api/trips/live/{route.id}", headers=login(client, "admin@test.com")).get_json()["live"]
    assert "live_lat" not in client.get("/api/transport", headers=parent_headers).get_json()[0]
    route.live_at = datetime.utcnow() - timedelta(minutes=10)
    db.session.commit()
    stale = client.get(f"/api/trips/live/{route.id}", headers=parent_headers).get_json()
    assert stale["live"] is False and stale["lat"] is None
    client.post("/api/trips/location", json={"lat": -1.47, "lng": 36.96}, headers=driver_headers)
    client.post("/api/trips/location/stop", headers=driver_headers)
    assert client.get(f"/api/trips/live/{route.id}", headers=parent_headers).get_json()["live"] is False
