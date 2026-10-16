import re
from datetime import date, datetime, timezone

from app.curriculum import term_year
from app.extensions import db
from app.models import FeeRate, Invoice, InvoiceLine, Payment
from app.services.school_year import ladder

CATEGORY_LABELS = {
    "tuition": "Tuition", "boarding": "Boarding", "meals": "Meals", "transport": "Transport",
    "activity": "Activities", "exam": "Exams", "other": "Other",
}


def next_number(model, column, prefix, year):
    stem = f"{prefix}-{year}-"
    numbers = [
        int(match.group(1))
        for (value,) in db.session.query(column).filter(column.like(f"{stem}%")).all()
        if value and (match := re.fullmatch(rf"{re.escape(stem)}(\d+)", value))
    ]
    return f"{stem}{(max(numbers) if numbers else 0) + 1:04d}"


def learner_type(student):
    return "boarder" if student.is_boarder else "day"


def rate_applies(rate, student):
    if rate.classroom_id and rate.classroom_id != student.classroom_id:
        return False
    if rate.learner_type != "all" and rate.learner_type != learner_type(student):
        return False
    if rate.transport_route_id and rate.transport_route_id != student.transport_route_id:
        return False
    if rate.item.category == "transport" and not student.transport_route_id:
        return False
    return rate.item.is_active


def lines_for(student, term):
    rates = FeeRate.query.filter_by(term=term).all()
    chosen = {}
    for rate in rates:
        if not rate_applies(rate, student):
            continue
        current = chosen.get(rate.item_id)
        specificity = (rate.classroom_id is not None) + (rate.learner_type != "all") + (rate.transport_route_id is not None)
        if current is None or specificity > current[0]:
            chosen[rate.item_id] = (specificity, rate)
    lines = [
        {"item_id": rate.item_id, "description": rate.item.name, "category": rate.item.category, "amount": rate.amount, "order": rate.item.sort_order}
        for _, rate in chosen.values()
    ]
    lines.sort(key=lambda line: (line["order"], line["description"]))
    for discount in student.discounts:
        if not discount.is_active:
            continue
        base = sum(line["amount"] for line in lines if discount.applies_to == "all" or line["category"] == discount.applies_to)
        if base <= 0:
            continue
        amount = round(base * discount.value / 100) if discount.kind == "percent" else min(discount.value, base)
        label = f"{discount.name} ({discount.value}% of {CATEGORY_LABELS.get(discount.applies_to, 'all fees').lower()})" if discount.kind == "percent" else discount.name
        lines.append({"item_id": None, "description": label, "category": "discount", "amount": -amount, "order": 999})
    return lines


def has_invoice(student, term):
    return any(invoice.term == term and invoice.status != "cancelled" for invoice in student.invoices)


def create_invoice(student, term, user=None, due_date=None, issued_on=None, note=None, lines=None):
    lines = lines if lines is not None else lines_for(student, term)
    if not lines:
        return None
    invoice = Invoice(
        number=next_number(Invoice, Invoice.number, "INV", term_year(term)),
        student=student, term=term, issued_on=issued_on or date.today(), due_date=due_date, note=note,
        created_by_id=user.id if user else None,
    )
    for line in lines:
        invoice.lines.append(InvoiceLine(item_id=line.get("item_id"), description=line["description"], category=line.get("category"), amount=line["amount"]))
    db.session.add(invoice)
    db.session.flush()
    return invoice


def generation_preview(term, classroom_ids=None):
    rows = []
    for classroom in ladder():
        if classroom_ids and classroom.id not in classroom_ids:
            continue
        learners = [student for student in classroom.students if student.status == "active"]
        pending = [student for student in learners if not has_invoice(student, term)]
        totals = [sum(line["amount"] for line in lines_for(student, term)) for student in pending]
        rows.append({
            "classroom_id": classroom.id, "name": classroom.name, "learners": len(learners),
            "already_invoiced": len(learners) - len(pending), "to_invoice": len(pending), "total": sum(totals),
            "missing_fees": sum(1 for total in totals if total <= 0),
        })
    return rows


def generate(term, user, classroom_ids=None, due_date=None):
    created = []
    for classroom in ladder():
        if classroom_ids and classroom.id not in classroom_ids:
            continue
        for student in classroom.students:
            if student.status != "active" or has_invoice(student, term):
                continue
            invoice = create_invoice(student, term, user, due_date)
            if invoice:
                created.append(invoice)
                refresh(student)
    return created


def completed_payments(student):
    return [payment for payment in student.payments if payment.status == "completed"]


def refresh(student):
    invoices = [invoice for invoice in student.invoices if invoice.status != "cancelled"]
    invoices.sort(key=lambda invoice: (invoice.issued_on, invoice.id or 0))
    available = sum(payment.amount for payment in completed_payments(student))
    for invoice in invoices:
        total = invoice.total
        applied = min(max(total, 0), available)
        available -= applied
        invoice.paid_amount = applied
        invoice.status = "paid" if applied >= total else "partial" if applied > 0 else "unpaid"
    for invoice in student.invoices:
        if invoice.status == "cancelled":
            invoice.paid_amount = 0
    owed = sum(invoice.total for invoice in invoices)
    paid = sum(payment.amount for payment in completed_payments(student))
    student.fee_balance = owed - paid
    return student.fee_balance


def record_payment(student, amount, method, user=None, reference=None, paid_on=None, phone=None, bank_name=None, note=None, receipt=None):
    paid_on = paid_on or date.today()
    payment = Payment(
        student=student, amount=amount, method=method, status="completed", phone=phone,
        reference=reference, bank_name=bank_name, note=note, paid_on=paid_on, receipt=receipt or reference,
        recorded_by_id=user.id if user else None,
        receipt_number=next_number(Payment, Payment.receipt_number, "RCP", paid_on.year),
    )
    db.session.add(payment)
    db.session.flush()
    refresh(student)
    return payment


def complete(payment, receipt, method="M-Pesa"):
    payment.status = "completed"
    payment.receipt = receipt
    payment.reference = payment.reference or receipt
    payment.method = payment.method or method
    payment.paid_on = payment.paid_on or date.today()
    if not payment.receipt_number:
        payment.receipt_number = next_number(Payment, Payment.receipt_number, "RCP", payment.paid_on.year)
    refresh(payment.student)
    return payment


def reverse(payment, reason, user):
    from app.models import PaybillReceipt

    for receipt in PaybillReceipt.query.filter_by(payment_id=payment.id).all():
        receipt.payment_id = None
        receipt.assigned_by_id = None
        receipt.assigned_at = None
    payment.status = "reversed"
    payment.reversed_reason = reason
    payment.reversed_by_id = user.id
    payment.reversed_at = datetime.now(timezone.utc)
    refresh(payment.student)


def cancel(invoice, reason, user):
    invoice.status = "cancelled"
    invoice.cancelled_reason = reason
    invoice.cancelled_by_id = user.id
    invoice.cancelled_at = datetime.now(timezone.utc)
    refresh(invoice.student)


def statement(student):
    entries = []
    for invoice in student.invoices:
        if invoice.status == "cancelled":
            continue
        entries.append({"date": invoice.issued_on, "kind": "invoice", "id": invoice.id, "reference": invoice.number,
                        "description": f"{invoice.term} fees", "debit": invoice.total, "credit": 0})
    for payment in completed_payments(student):
        entries.append({"date": payment.paid_on or payment.created_at.date(), "kind": "payment", "id": payment.id,
                        "reference": payment.receipt_number or payment.receipt, "description": f"Payment by {payment.method}" + (f" ({payment.reference})" if payment.reference else ""),
                        "debit": 0, "credit": payment.amount})
    entries.sort(key=lambda entry: (entry["date"], 0 if entry["kind"] == "invoice" else 1, entry["id"]))
    running = 0
    for entry in entries:
        running += entry["debit"] - entry["credit"]
        entry["balance"] = running
        entry["date"] = entry["date"].isoformat()
    return entries
