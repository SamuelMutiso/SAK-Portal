import pytest

from app.extensions import db
from app.models import Discount, FeeItem, FeeRate, Invoice, Student, User
from tests.conftest import accept_policies

TERM = "Term 3 2026"


@pytest.fixture
def structure(app):
    tuition = FeeItem(name="Tuition", category="tuition", sort_order=1)
    boarding = FeeItem(name="Boarding", category="boarding", sort_order=2)
    lunch = FeeItem(name="Lunch", category="meals", sort_order=3)
    db.session.add_all([tuition, boarding, lunch])
    db.session.flush()
    db.session.add_all([
        FeeRate(item_id=tuition.id, term=TERM, amount=20000),
        FeeRate(item_id=tuition.id, term=TERM, classroom_id=2, amount=22000),
        FeeRate(item_id=boarding.id, term=TERM, learner_type="boarder", amount=15000),
        FeeRate(item_id=lunch.id, term=TERM, learner_type="day", amount=5000),
    ])
    db.session.commit()


@pytest.fixture
def bursar_headers(client):
    bursar = User(full_name="Bursar", email="bursar@test.com", phone="0700000011", role="bursar")
    bursar.set_password("password123")
    db.session.add(bursar)
    db.session.commit()
    accept_policies(bursar)
    db.session.commit()
    response = client.post("/api/auth/login", json={"email": "bursar@test.com", "password": "password123"})
    return {"Authorization": f"Bearer {response.get_json()['access_token']}"}


def generate(client, headers):
    return client.post("/api/fees/invoices/generate", json={"term": TERM}, headers=headers)


def test_invoices_follow_class_and_learner_type(client, bursar_headers, structure):
    response = generate(client, bursar_headers)
    assert response.get_json()["created"] == 2
    ethan = Invoice.query.filter_by(student_id=1).first()
    zawadi = Invoice.query.filter_by(student_id=2).first()
    assert ethan.total == 35000
    assert zawadi.total == 27000
    assert ethan.number.startswith("INV-2026-")


def test_generating_twice_does_not_double_bill(client, bursar_headers, structure):
    generate(client, bursar_headers)
    assert generate(client, bursar_headers).get_json()["created"] == 0
    assert Invoice.query.count() == 2


def test_discount_reduces_tuition(client, bursar_headers, structure):
    discount = Discount(name="Sibling discount", kind="percent", value=10, applies_to="tuition")
    db.session.add(discount)
    db.session.commit()
    client.put("/api/fees/students/1/discounts", json={"discount_ids": [discount.id]}, headers=bursar_headers)
    generate(client, bursar_headers)
    assert Invoice.query.filter_by(student_id=1).first().total == 33000


def test_payment_updates_invoice_and_balance(client, bursar_headers, structure):
    generate(client, bursar_headers)
    response = client.post("/api/fees/payments", json={"student_id": 1, "amount": 20000, "method": "Bank", "reference": "eq123456", "bank_name": "Equity"}, headers=bursar_headers)
    data = response.get_json()
    assert response.status_code == 201
    assert data["payment"]["receipt_number"].startswith("RCP-")
    assert data["payment"]["reference"] == "EQ123456"
    assert data["balance"] == 15000
    assert Invoice.query.filter_by(student_id=1).first().status == "partial"
    assert "RCP-" in data["sms"]["message"]


def test_same_reference_cannot_be_used_twice(client, bursar_headers, structure):
    generate(client, bursar_headers)
    payload = {"student_id": 1, "amount": 1000, "method": "Cheque", "reference": "000123"}
    client.post("/api/fees/payments", json=payload, headers=bursar_headers)
    assert client.post("/api/fees/payments", json=payload, headers=bursar_headers).status_code == 400


def test_bank_payment_needs_reference(client, bursar_headers):
    response = client.post("/api/fees/payments", json={"student_id": 1, "amount": 1000, "method": "Bank"}, headers=bursar_headers)
    assert response.status_code == 400


def test_cash_does_not_need_reference(client, bursar_headers, structure):
    generate(client, bursar_headers)
    assert client.post("/api/fees/payments", json={"student_id": 1, "amount": 35000, "method": "Cash"}, headers=bursar_headers).get_json()["balance"] == 0
    assert Invoice.query.filter_by(student_id=1).first().status == "paid"


def test_reversal_puts_balance_back(client, bursar_headers, structure):
    generate(client, bursar_headers)
    payment = client.post("/api/fees/payments", json={"student_id": 1, "amount": 10000, "method": "Cash"}, headers=bursar_headers).get_json()["payment"]
    response = client.post(f"/api/fees/payments/{payment['id']}/reverse", json={"reason": "Recorded on the wrong learner"}, headers=bursar_headers)
    assert response.get_json()["status"] == "reversed"
    assert db.session.get(Student, 1).fee_balance == 35000


def test_cancelled_invoice_drops_from_balance(client, bursar_headers, structure):
    generate(client, bursar_headers)
    invoice = Invoice.query.filter_by(student_id=1).first()
    client.post(f"/api/fees/invoices/{invoice.id}/cancel", json={"reason": "Learner did not report this term"}, headers=bursar_headers)
    assert db.session.get(Student, 1).fee_balance == 0
    assert client.post("/api/fees/students/1/invoice", json={"term": TERM}, headers=bursar_headers).status_code == 201


def test_overpayment_becomes_credit(client, bursar_headers, structure):
    generate(client, bursar_headers)
    client.post("/api/fees/payments", json={"student_id": 1, "amount": 40000, "method": "Cash"}, headers=bursar_headers)
    assert db.session.get(Student, 1).fee_balance == -5000


def test_parent_sees_own_statement_only(client, bursar_headers, parent_headers, structure):
    generate(client, bursar_headers)
    client.post("/api/fees/payments", json={"student_id": 1, "amount": 5000, "method": "Cash"}, headers=bursar_headers)
    statement = client.get("/api/fees/students/1/statement", headers=parent_headers).get_json()
    assert statement["balance"] == 30000
    assert [entry["balance"] for entry in statement["ledger"]] == [35000, 30000]
    assert client.get("/api/fees/students/2/statement", headers=parent_headers).status_code == 403


def test_teacher_and_parent_cannot_record_payments(client, teacher_headers, parent_headers):
    payload = {"student_id": 1, "amount": 1000, "method": "Cash"}
    assert client.post("/api/fees/payments", json=payload, headers=teacher_headers).status_code == 403
    assert client.post("/api/fees/payments", json=payload, headers=parent_headers).status_code == 403


def test_summary_counts_collection(client, bursar_headers, structure):
    generate(client, bursar_headers)
    client.post("/api/fees/payments", json={"student_id": 2, "amount": 27000, "method": "Cash"}, headers=bursar_headers)
    data = client.get(f"/api/fees/summary?term={TERM}", headers=bursar_headers).get_json()
    assert data["expected"] == 62000
    assert data["collected"] == 27000
    assert data["cleared"] == 1


def test_copy_structure_to_next_term(client, bursar_headers, structure):
    response = client.post("/api/fees/structure/copy", json={"from_term": TERM, "to_term": "Term 1 2027"}, headers=bursar_headers)
    assert response.get_json()["copied"] == 4
    assert client.post("/api/fees/structure/copy", json={"from_term": TERM, "to_term": "Term 1 2027"}, headers=bursar_headers).status_code == 400


def test_stk_simulation_goes_through_ledger(client, bursar_headers, parent_headers, structure):
    generate(client, bursar_headers)
    response = client.post("/api/payments/stk", json={"student_id": 1, "amount": 5000, "phone": "0700000003"}, headers=parent_headers)
    assert response.get_json()["payment"]["receipt_number"].startswith("RCP-")
    assert db.session.get(Student, 1).fee_balance == 30000
