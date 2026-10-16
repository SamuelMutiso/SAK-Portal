import random
import re
import string
from datetime import datetime

from app.extensions import db
from app.models import PaybillReceipt, Student
from app.services import ledger


def clean(text):
    return re.sub(r"[^A-Z0-9]", "", str(text or "").upper())


def find_student(account):
    wanted = clean(account)
    if len(wanted) < 4:
        return None
    for student in Student.query.filter(Student.status == "active").all():
        number = clean(student.admission_number)
        if wanted in (number, number.removeprefix("SAK")):
            return student
    return None


def parse_time(value):
    try:
        return datetime.strptime(str(value), "%Y%m%d%H%M%S")
    except ValueError:
        return datetime.utcnow()


def assign(receipt, student, user=None):
    note = None if user is None else f"Paybill account typed as {receipt.account}"
    payment = ledger.record_payment(student, receipt.amount, "Paybill", user, reference=receipt.trans_id, paid_on=receipt.received_at.date(),
                                    phone=student.parent.phone if student.parent else receipt.phone, note=note)
    receipt.payment_id = payment.id
    receipt.assigned_by_id = user.id if user else None
    receipt.assigned_at = datetime.utcnow()
    return payment


def receive(data):
    trans_id = str(data.get("TransID", "")).strip()
    if not trans_id:
        return None, None
    existing = PaybillReceipt.query.filter_by(trans_id=trans_id).first()
    if existing:
        return existing, None
    name = " ".join(part for part in (data.get("FirstName"), data.get("MiddleName"), data.get("LastName")) if part)
    receipt = PaybillReceipt(
        trans_id=trans_id, amount=int(float(data.get("TransAmount") or 0)), phone=str(data.get("MSISDN") or "")[:20],
        payer_name=name[:120] or None, account=str(data.get("BillRefNumber") or "")[:40], received_at=parse_time(data.get("TransTime")),
    )
    db.session.add(receipt)
    db.session.flush()
    student = find_student(receipt.account)
    payment = assign(receipt, student) if student and receipt.amount > 0 else None
    return receipt, payment


def demo_code():
    return "T" + "".join(random.choices(string.ascii_uppercase + string.digits, k=9))
