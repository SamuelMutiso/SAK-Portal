from app.extensions import db
from app.models import PaybillReceipt, Student
from app.services import ledger
from app.services.mpesa import callback_token


def owe(app, amount=5000):
    student = db.session.get(Student, 1)
    student.admission_number = "SAK-2026-0101"
    ledger.create_invoice(student, "Term 3 2026", lines=[{"description": "Tuition", "category": "tuition", "amount": amount}])
    ledger.refresh(student)
    db.session.commit()
    return student


def confirmation(account, amount=2000, trans_id="TJK11AA22B"):
    return {"TransactionType": "Pay Bill", "TransID": trans_id, "TransTime": "20261016143000", "TransAmount": str(amount),
            "BusinessShortCode": "600000", "BillRefNumber": account, "MSISDN": "254700000003", "FirstName": "PARENT"}


def test_paybill_matches_admission_number_typed_loosely(app, client):
    student = owe(app)
    number = student.admission_number.lower().replace("-", " ")
    response = client.post(f"/api/paybill/confirmation?token={callback_token()}", json=confirmation(number))
    assert response.get_json()["ResultCode"] == 0
    receipt = PaybillReceipt.query.one()
    assert receipt.payment.student_id == student.id
    assert receipt.payment.method == "Paybill"
    assert db.session.get(Student, 1).fee_balance == 3000


def test_same_transaction_is_not_counted_twice(app, client):
    student = owe(app)
    body = confirmation(student.admission_number)
    client.post(f"/api/paybill/confirmation?token={callback_token()}", json=body)
    client.post(f"/api/paybill/confirmation?token={callback_token()}", json=body)
    assert PaybillReceipt.query.count() == 1
    assert db.session.get(Student, 1).fee_balance == 3000


def test_unknown_account_waits_for_bursar(app, client, admin_headers):
    owe(app)
    client.post(f"/api/paybill/confirmation?token={callback_token()}", json=confirmation("FEES FOR JOHN"))
    data = client.get("/api/paybill/receipts", headers=admin_headers).get_json()
    assert data["unmatched"] == 1
    receipt_id = data["receipts"][0]["id"]
    response = client.post(f"/api/paybill/receipts/{receipt_id}/assign", json={"student_id": 1}, headers=admin_headers)
    assert response.get_json()["receipt"]["matched"] is True
    assert db.session.get(Student, 1).fee_balance == 3000
    assert client.post(f"/api/paybill/receipts/{receipt_id}/assign", json={"student_id": 1}, headers=admin_headers).status_code == 400


def test_confirmation_needs_token(app, client):
    owe(app)
    assert client.post("/api/paybill/confirmation", json=confirmation("A1")).status_code == 403
    assert PaybillReceipt.query.count() == 0


def test_reversing_a_paybill_payment_frees_it_to_rematch(app, client, admin_headers):
    student = owe(app)
    client.post(f"/api/paybill/confirmation?token={callback_token()}", json=confirmation(student.admission_number))
    payment_id = PaybillReceipt.query.one().payment_id
    client.post(f"/api/fees/payments/{payment_id}/reverse", json={"reason": "Wrong learner"}, headers=admin_headers)
    assert PaybillReceipt.query.one().payment_id is None
    assert db.session.get(Student, 1).fee_balance == 5000


def test_simulated_paybill_for_demo(app, client, admin_headers, parent_headers):
    student = owe(app)
    response = client.post("/api/paybill/simulate", json={"account": student.admission_number, "amount": 1500}, headers=admin_headers)
    assert response.status_code == 201
    assert response.get_json()["receipt"]["matched"] is True
    assert client.post("/api/paybill/simulate", json={"account": "x", "amount": 10}, headers=parent_headers).status_code == 403
