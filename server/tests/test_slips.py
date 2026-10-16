import io

from app.extensions import db
from app.models import Student
from app.services import ledger


def bill(app, amount=30000):
    with app.app_context():
        student = db.session.get(Student, 1)
        ledger.create_invoice(student, "Term 3 2026", lines=[{"description": "Tuition", "category": "tuition", "amount": amount}])
        ledger.refresh(student)
        db.session.commit()


def upload(client, headers, reference="EQ88231", student_id=1, filename="slip.jpg", content=b"\xff\xd8\xff\xe0 real jpeg"):
    data = {"student_id": str(student_id), "amount": "12000", "reference": reference, "bank_name": "Equity Bank", "paid_on": "2026-10-10",
            "slip": (io.BytesIO(content), filename)}
    return client.post("/api/fees/slips", data=data, headers=headers, content_type="multipart/form-data")


def test_parent_uploads_and_bursar_approves(app, client, parent_headers, admin_headers):
    bill(app)
    slip = upload(client, parent_headers).get_json()
    assert slip["status"] == "pending"
    assert db.session.get(Student, 1).fee_balance == 30000
    queue = client.get("/api/fees/slips", headers=admin_headers).get_json()
    assert queue["pending"] == 1
    approved = client.post(f"/api/fees/slips/{slip['id']}/approve", json={}, headers=admin_headers).get_json()
    assert approved["slip"]["receipt_number"].startswith("RCP-")
    assert db.session.get(Student, 1).fee_balance == 18000


def test_bursar_can_correct_the_amount(app, client, parent_headers, admin_headers):
    bill(app)
    slip = upload(client, parent_headers).get_json()
    client.post(f"/api/fees/slips/{slip['id']}/approve", json={"amount": 10000}, headers=admin_headers)
    assert db.session.get(Student, 1).fee_balance == 20000


def test_rejected_slip_changes_nothing(app, client, parent_headers, admin_headers):
    bill(app)
    slip = upload(client, parent_headers).get_json()
    response = client.post(f"/api/fees/slips/{slip['id']}/reject", json={"reason": "Not on the bank statement"}, headers=admin_headers).get_json()
    assert response["slip"]["status"] == "rejected"
    assert "Not on the bank statement" in response["sms"]["message"]
    assert db.session.get(Student, 1).fee_balance == 30000


def test_same_slip_cannot_be_sent_twice(app, client, parent_headers):
    bill(app)
    upload(client, parent_headers)
    assert upload(client, parent_headers).status_code == 400


def test_parent_cannot_upload_for_other_child(client, parent_headers):
    assert upload(client, parent_headers, student_id=2).status_code == 403


def test_only_images_or_pdf(client, parent_headers):
    assert upload(client, parent_headers, filename="slip.exe").status_code == 400


def test_parent_cannot_approve(app, client, parent_headers):
    bill(app)
    slip = upload(client, parent_headers).get_json()
    assert client.post(f"/api/fees/slips/{slip['id']}/approve", json={}, headers=parent_headers).status_code == 403


def test_slip_file_is_private(app, client, parent_headers, other_parent_headers):
    bill(app)
    slip = upload(client, parent_headers).get_json()
    assert client.get(f"/api/fees/slips/{slip['id']}/file", headers=parent_headers).status_code == 200
    assert client.get(f"/api/fees/slips/{slip['id']}/file", headers=other_parent_headers).status_code == 403


def test_renamed_file_is_rejected(client, parent_headers):
    assert upload(client, parent_headers, filename="slip.pdf", content=b"<script>alert(1)</script>").status_code == 400
