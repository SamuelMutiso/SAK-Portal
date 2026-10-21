from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func, or_

from app.curriculum import current_term
from app.extensions import db, limiter
from app.models import Discount, FeeItem, FeeRate, Invoice, PaybillReceipt, Payment, PaymentSlip, SchoolTerm, Student
from app.schemas import StudentSchema
from app.schemas.fees import (
    DiscountSchema, FeeItemSchema, FeeRateSchema, GenerateSchema, InvoiceSchema, LedgerPaymentSchema, ReasonSchema, RecordPaymentSchema,
)
from app.services import ledger
from app.services.sms import send_sms
from app.services.uploads import private_folder, save_private, send_stored
from app.utils.roles import current_user, roles_required, search_students, viewable_student

fees_bp = Blueprint("fees", __name__, url_prefix="/api/fees")
FEE_ROLES = ("admin", "bursar")


def fee_message(student):
    paybill = current_app.config["SCHOOL_PAYBILL"]
    how_to_pay = f"Paybill {paybill}" if paybill else "the school M-Pesa Paybill"
    return (
        f"Success Academy: Dear parent, {student.first_name}'s fee balance is KES {student.fee_balance:,}. "
        f"Pay via {how_to_pay}, account {student.admission_number}. Thank you."
    )


def receipt_message(payment):
    student = payment.student
    balance = student.fee_balance
    balance_text = f"New balance KES {balance:,}." if balance > 0 else ("Fees fully paid. Thank you." if balance == 0 else f"Credit KES {-balance:,}.")
    link = f" View receipt: {current_app.config['PORTAL_URL']}/parent/receipts/{payment.id}" if payment.id else ""
    return (f"Success Academy: Received KES {payment.amount:,} for {student.first_name} ({student.admission_number}) by {payment.method}"
            f"{f' (M-Pesa {payment.receipt})' if payment.receipt and payment.method in ('M-Pesa', 'Paybill') else ''}. "
            f"Receipt {payment.receipt_number}. {balance_text}{link}")


def selected_term():
    return request.args.get("term") or current_term()


@fees_bp.get("")
@roles_required(*FEE_ROLES)
def list_balances():
    students = Student.query.filter(Student.fee_balance > 0).order_by(Student.fee_balance.desc()).all()
    return jsonify(
        total=sum(student.fee_balance for student in students),
        students=StudentSchema(many=True).dump(students),
    )


@fees_bp.post("/remind")
@limiter.limit("20 per hour")
@roles_required(*FEE_ROLES)
def send_fee_reminders():
    student_ids = (request.get_json() or {}).get("student_ids")
    query = Student.query.filter(Student.fee_balance > 0)
    if student_ids:
        query = query.filter(Student.id.in_(student_ids))

    sent = delivered = 0
    recipients = []
    sample = None
    for student in query.all():
        if not student.parent or not student.parent.is_active:
            continue
        message = fee_message(student)
        result = send_sms([student.parent.phone], message)
        sent += result["sent"]
        delivered += result["delivered"]
        recipients += result["recipients"]
        sample = sample or message

    mode = "live" if delivered else "preview" if sent else "none"
    return jsonify(sms={"sent": sent, "delivered": delivered, "mode": mode, "recipients": recipients, "message": sample})


@fees_bp.get("/items")
@roles_required(*FEE_ROLES)
def list_items():
    items = FeeItem.query.order_by(FeeItem.sort_order, FeeItem.name).all()
    return jsonify(FeeItemSchema(many=True).dump(items))


@fees_bp.post("/items")
@roles_required(*FEE_ROLES)
def create_item():
    data = FeeItemSchema().load(request.get_json() or {})
    if FeeItem.query.filter(db.func.lower(FeeItem.name) == data["name"].lower()).first():
        return jsonify(error="A fee item with this name already exists"), 400
    item = FeeItem(**data)
    db.session.add(item)
    db.session.commit()
    return jsonify(FeeItemSchema().dump(item)), 201


@fees_bp.patch("/items/<int:item_id>")
@roles_required(*FEE_ROLES)
def update_item(item_id):
    item = db.get_or_404(FeeItem, item_id)
    data = FeeItemSchema().load(request.get_json() or {}, partial=True)
    for field, value in data.items():
        setattr(item, field, value)
    db.session.commit()
    return jsonify(FeeItemSchema().dump(item))


@fees_bp.get("/structure")
@roles_required(*FEE_ROLES)
def structure():
    term = selected_term()
    rates = FeeRate.query.filter_by(term=term).all()
    return jsonify(
        term=term,
        items=FeeItemSchema(many=True).dump(FeeItem.query.order_by(FeeItem.sort_order, FeeItem.name).all()),
        rates=FeeRateSchema(many=True).dump(rates),
        classes=[{"id": classroom.id, "name": classroom.name} for classroom in ledger.ladder()],
        invoiced=Invoice.query.filter(Invoice.term == term, Invoice.status != "cancelled").count(),
    )


@fees_bp.post("/rates")
@roles_required(*FEE_ROLES)
def create_rate():
    data = FeeRateSchema().load(request.get_json() or {})
    db.get_or_404(FeeItem, data["item_id"])
    clash = FeeRate.query.filter_by(item_id=data["item_id"], term=data["term"], classroom_id=data["classroom_id"],
                                    learner_type=data["learner_type"], transport_route_id=data["transport_route_id"]).first()
    if clash:
        clash.amount = data["amount"]
        rate = clash
    else:
        rate = FeeRate(**data)
        db.session.add(rate)
    db.session.commit()
    return jsonify(FeeRateSchema().dump(rate)), 201


@fees_bp.patch("/rates/<int:rate_id>")
@roles_required(*FEE_ROLES)
def update_rate(rate_id):
    rate = db.get_or_404(FeeRate, rate_id)
    data = FeeRateSchema().load(request.get_json() or {}, partial=True)
    rate.amount = data.get("amount", rate.amount)
    db.session.commit()
    return jsonify(FeeRateSchema().dump(rate))


@fees_bp.delete("/rates/<int:rate_id>")
@roles_required(*FEE_ROLES)
def delete_rate(rate_id):
    rate = db.get_or_404(FeeRate, rate_id)
    db.session.delete(rate)
    db.session.commit()
    return "", 204


@fees_bp.post("/structure/copy")
@roles_required(*FEE_ROLES)
def copy_structure():
    data = request.get_json() or {}
    source, target = data.get("from_term"), data.get("to_term")
    if not source or not target or source == target:
        return jsonify(error="Choose two different terms"), 400
    if FeeRate.query.filter_by(term=target).first():
        return jsonify(error=f"{target} already has fees. Change them there instead."), 400
    copied = 0
    for rate in FeeRate.query.filter_by(term=source).all():
        db.session.add(FeeRate(item_id=rate.item_id, term=target, classroom_id=rate.classroom_id, learner_type=rate.learner_type,
                               transport_route_id=rate.transport_route_id, amount=rate.amount))
        copied += 1
    db.session.commit()
    return jsonify(copied=copied), 201


@fees_bp.get("/discounts")
@roles_required(*FEE_ROLES)
def list_discounts():
    return jsonify(DiscountSchema(many=True).dump(Discount.query.order_by(Discount.name).all()))


@fees_bp.post("/discounts")
@roles_required(*FEE_ROLES)
def create_discount():
    data = DiscountSchema().load(request.get_json() or {})
    discount = Discount(**data)
    db.session.add(discount)
    db.session.commit()
    return jsonify(DiscountSchema().dump(discount)), 201


@fees_bp.put("/students/<int:student_id>/discounts")
@roles_required(*FEE_ROLES)
def set_student_discounts(student_id):
    student = db.get_or_404(Student, student_id)
    ids = (request.get_json() or {}).get("discount_ids", [])
    student.discounts = Discount.query.filter(Discount.id.in_(ids)).all()
    db.session.commit()
    return jsonify(DiscountSchema(many=True).dump(student.discounts))


@fees_bp.get("/invoices/preview")
@roles_required(*FEE_ROLES)
def invoice_preview():
    term = selected_term()
    sample = request.args.get("student_id", type=int)
    term_row = SchoolTerm.query.filter_by(name=term).first()
    return jsonify(
        term=term,
        due_date=term_row.fee_due_date.isoformat() if term_row and term_row.fee_due_date else None,
        rows=ledger.generation_preview(term),
        sample=ledger.lines_for(db.get_or_404(Student, sample), term) if sample else None,
    )


@fees_bp.post("/invoices/generate")
@roles_required(*FEE_ROLES)
def generate_invoices():
    data = GenerateSchema().load(request.get_json() or {})
    created = ledger.generate(data["term"], current_user(), data["classroom_ids"] or None, data["due_date"])
    db.session.commit()
    return jsonify(created=len(created), total=sum(invoice.total for invoice in created)), 201


@fees_bp.get("/invoices")
@roles_required(*FEE_ROLES)
def list_invoices():
    query = Invoice.query.join(Student)
    term = request.args.get("term")
    if term:
        query = query.filter(Invoice.term == term)
    status = request.args.get("status")
    if status:
        query = query.filter(Invoice.status == status)
    classroom_id = request.args.get("classroom_id", type=int)
    if classroom_id:
        query = query.filter(Student.classroom_id == classroom_id)
    search = request.args.get("search", "").strip()
    if search:
        query = search_students(query, search) if not search.upper().startswith("INV") else query.filter(Invoice.number.ilike(f"%{search}%"))
    invoices = query.order_by(Invoice.issued_on.desc(), Invoice.id.desc()).limit(300).all()
    return jsonify(InvoiceSchema(many=True).dump(invoices))


@fees_bp.get("/invoices/<int:invoice_id>")
@jwt_required()
def get_invoice(invoice_id):
    invoice = db.get_or_404(Invoice, invoice_id)
    viewable_student(invoice.student_id)
    return jsonify(InvoiceSchema().dump(invoice))


@fees_bp.post("/invoices/<int:invoice_id>/cancel")
@roles_required(*FEE_ROLES)
def cancel_invoice(invoice_id):
    invoice = db.get_or_404(Invoice, invoice_id)
    if invoice.status == "cancelled":
        return jsonify(error="This invoice is already cancelled"), 400
    data = ReasonSchema().load(request.get_json() or {})
    ledger.cancel(invoice, data["reason"], current_user())
    db.session.commit()
    return jsonify(InvoiceSchema().dump(invoice))


@fees_bp.post("/students/<int:student_id>/invoice")
@roles_required(*FEE_ROLES)
def invoice_one(student_id):
    student = db.get_or_404(Student, student_id)
    term = (request.get_json() or {}).get("term") or current_term()
    if ledger.has_invoice(student, term):
        return jsonify(error=f"{student.first_name} already has an invoice for {term}"), 400
    invoice = ledger.create_invoice(student, term, current_user())
    if not invoice:
        return jsonify(error=f"No fees are set for {student.first_name}'s class in {term}"), 400
    ledger.refresh(student)
    db.session.commit()
    return jsonify(InvoiceSchema().dump(invoice)), 201


@fees_bp.post("/payments")
@roles_required(*FEE_ROLES)
def record_payment():
    data = RecordPaymentSchema().load(request.get_json() or {})
    student = db.get_or_404(Student, data["student_id"])
    reference = (data.get("reference") or "").strip().upper() or None
    if reference and Payment.query.filter(Payment.reference == reference, Payment.status == "completed").first():
        return jsonify(error=f"A payment with reference {reference} is already recorded"), 400
    payment = ledger.record_payment(
        student, data["amount"], data["method"], current_user(), reference=reference, paid_on=data.get("paid_on"),
        bank_name=data.get("bank_name"), note=data.get("note"), phone=student.parent.phone if student.parent else None,
    )
    db.session.commit()
    message = receipt_message(payment)
    sms = send_sms([student.parent.phone], message) if student.parent else {"sent": 0, "mode": "none", "recipients": []}
    return jsonify(payment=LedgerPaymentSchema().dump(payment), balance=student.fee_balance, sms={"message": message, **sms}), 201


@fees_bp.get("/payments")
@roles_required(*FEE_ROLES)
def list_payments():
    query = Payment.query.join(Student)
    start = request.args.get("from")
    end = request.args.get("to")
    day = func.coalesce(Payment.paid_on, func.date(Payment.created_at))
    if start:
        query = query.filter(day >= date.fromisoformat(start))
    if end:
        query = query.filter(day <= date.fromisoformat(end))
    method = request.args.get("method")
    if method:
        query = query.filter(Payment.method == method)
    status = request.args.get("status", "completed")
    if status != "all":
        query = query.filter(Payment.status == status)
    search = request.args.get("search", "").strip()
    if search:
        pattern = f"%{search}%"
        query = query.filter(or_(Payment.reference.ilike(pattern), Payment.receipt_number.ilike(pattern), Student.first_name.ilike(pattern),
                                 Student.last_name.ilike(pattern), Student.admission_number.ilike(pattern)))
    payments = query.order_by(day.desc(), Payment.id.desc()).limit(300).all()
    return jsonify(payments=LedgerPaymentSchema(many=True).dump(payments), total=sum(payment.amount for payment in payments if payment.status == "completed"))


@fees_bp.get("/payments/<int:payment_id>")
@jwt_required()
def get_payment(payment_id):
    payment = db.get_or_404(Payment, payment_id)
    student = viewable_student(payment.student_id)
    if payment.status not in ("completed", "reversed"):
        return jsonify(error="There is no receipt because this payment did not go through"), 404
    return jsonify(
        payment=LedgerPaymentSchema().dump(payment),
        student={"full_name": student.full_name, "admission_number": student.admission_number,
                 "classroom_name": student.classroom.name if student.classroom else student.last_classroom_name,
                 "parent_name": student.parent.full_name if student.parent else None},
        balance=student.fee_balance,
    )


@fees_bp.post("/payments/<int:payment_id>/reverse")
@roles_required(*FEE_ROLES)
def reverse_payment(payment_id):
    payment = db.get_or_404(Payment, payment_id)
    if payment.status != "completed":
        return jsonify(error="Only completed payments can be reversed"), 400
    data = ReasonSchema().load(request.get_json() or {})
    ledger.reverse(payment, data["reason"], current_user())
    db.session.commit()
    return jsonify(LedgerPaymentSchema().dump(payment))


@fees_bp.get("/students/<int:student_id>/statement")
@jwt_required()
def student_statement(student_id):
    student = viewable_student(student_id)
    shown = [payment for payment in student.payments if payment.status != "failed"]
    payments = sorted(shown, key=lambda payment: (payment.paid_on or payment.created_at.date(), payment.id), reverse=True)
    return jsonify(
        student={"id": student.id, "full_name": student.full_name, "first_name": student.first_name, "gender": student.gender, "admission_number": student.admission_number,
                 "classroom_name": student.classroom.name if student.classroom else student.last_classroom_name,
                 "is_boarder": student.is_boarder, "route_name": student.transport_route.name if student.transport_route else None,
                 "parent_name": student.parent.full_name if student.parent else None,
                 "parent_phone": student.parent.phone if student.parent else None, "status": student.status},
        balance=student.fee_balance,
        invoices=InvoiceSchema(many=True).dump(sorted(student.invoices, key=lambda invoice: (invoice.issued_on, invoice.id), reverse=True)),
        payments=LedgerPaymentSchema(many=True).dump(payments),
        ledger=ledger.statement(student),
        discounts=DiscountSchema(many=True).dump(student.discounts),
        paybill=current_app.config["SCHOOL_PAYBILL"] or None,
    )


@fees_bp.get("/summary")
@roles_required(*FEE_ROLES)
def summary():
    term = selected_term()
    invoices = Invoice.query.filter(Invoice.term == term, Invoice.status != "cancelled").all()
    expected = sum(invoice.total for invoice in invoices)
    collected = sum(invoice.paid_amount for invoice in invoices)
    by_class = defaultdict(lambda: {"expected": 0, "collected": 0, "learners": 0, "cleared": 0})
    for invoice in invoices:
        name = invoice.student.classroom.name if invoice.student.classroom else invoice.student.last_classroom_name or "Left school"
        row = by_class[name]
        row["expected"] += invoice.total
        row["collected"] += invoice.paid_amount
        row["learners"] += 1
        row["cleared"] += invoice.status == "paid"
    order = {classroom.name: index for index, classroom in enumerate(ledger.ladder())}
    classes = [{"name": name, **values, "outstanding": values["expected"] - values["collected"]} for name, values in by_class.items()]
    classes.sort(key=lambda row: order.get(row["name"], 99))

    today = date.today()
    recent = Payment.query.filter(Payment.status == "completed").order_by(Payment.paid_on.desc(), Payment.id.desc()).limit(8).all()
    week = Payment.query.filter(Payment.status == "completed", Payment.paid_on >= today - timedelta(days=6)).all()
    by_method = defaultdict(int)
    for payment in week:
        by_method[payment.method] += payment.amount
    days = [{"date": (today - timedelta(days=offset)).isoformat(),
             "amount": sum(payment.amount for payment in week if payment.paid_on == today - timedelta(days=offset))} for offset in range(6, -1, -1)]
    arrears = Student.query.filter(Student.fee_balance > 0).count()
    return jsonify(
        term=term, expected=expected, collected=collected, outstanding=expected - collected,
        rate=round(collected / expected * 100) if expected else 0,
        invoiced=len(invoices), cleared=sum(1 for invoice in invoices if invoice.status == "paid"),
        all_outstanding=sum(student.fee_balance for student in Student.query.filter(Student.fee_balance > 0).all()),
        learners_owing=arrears, classes=classes, today=sum(payment.amount for payment in week if payment.paid_on == today),
        week=sum(by_method.values()), by_method=dict(by_method), days=days,
        recent=LedgerPaymentSchema(many=True).dump(recent),
        not_invoiced=sum(row["to_invoice"] for row in ledger.generation_preview(term)),
        slips_pending=PaymentSlip.query.filter_by(status="pending").count(),
        paybill_unmatched=PaybillReceipt.query.filter(PaybillReceipt.payment_id.is_(None)).count(),
    )


def slip_dump(slip):
    return {
        "id": slip.id, "student_id": slip.student_id, "student_name": slip.student.full_name,
        "admission_number": slip.student.admission_number,
        "classroom_name": slip.student.classroom.name if slip.student.classroom else slip.student.last_classroom_name,
        "balance": slip.student.fee_balance, "amount": slip.amount, "bank_name": slip.bank_name, "reference": slip.reference,
        "paid_on": slip.paid_on.isoformat(), "note": slip.note, "status": slip.status,
        "is_pdf": slip.file_name.endswith(".pdf"),
        "submitted_by": slip.submitted_by.full_name if slip.submitted_by else None,
        "reviewed_by": slip.reviewed_by.full_name if slip.reviewed_by else None,
        "reviewed_at": slip.reviewed_at.isoformat() if slip.reviewed_at else None,
        "rejection_reason": slip.rejection_reason, "created_at": slip.created_at.isoformat(),
        "receipt_number": slip.payment.receipt_number if slip.payment else None, "payment_id": slip.payment_id,
    }


def reference_taken(reference, exclude_slip=None):
    if Payment.query.filter(Payment.reference == reference, Payment.status == "completed").first():
        return True
    query = PaymentSlip.query.filter(PaymentSlip.reference == reference, PaymentSlip.status != "rejected")
    if exclude_slip:
        query = query.filter(PaymentSlip.id != exclude_slip)
    return query.first() is not None


@fees_bp.post("/slips")
@limiter.limit("20 per hour")
@roles_required("parent", "admin", "bursar")
def upload_slip():
    user = current_user()
    student = viewable_student(request.form.get("student_id", type=int))
    amount = request.form.get("amount", type=int)
    reference = request.form.get("reference", "").strip().upper()
    bank_name = request.form.get("bank_name", "").strip()
    paid_on = request.form.get("paid_on", "")
    upload = request.files.get("slip")
    if not amount or amount < 1 or amount > 1000000:
        return jsonify(error="Enter the amount on the slip"), 400
    if len(reference) < 4:
        return jsonify(error="Enter the transaction or slip number printed on the slip"), 400
    if not bank_name:
        return jsonify(error="Choose the bank"), 400
    try:
        paid = date.fromisoformat(paid_on)
    except ValueError:
        return jsonify(error="Enter the date on the slip"), 400
    if paid > date.today():
        return jsonify(error="The slip date cannot be in the future"), 400
    if not upload:
        return jsonify(error="Attach a photo of the slip"), 400
    if reference_taken(reference):
        return jsonify(error=f"Slip {reference} has already been sent or recorded"), 400
    try:
        name = save_private(upload)
    except ValueError as error:
        return jsonify(error=str(error)), 400
    slip = PaymentSlip(student_id=student.id, submitted_by_id=user.id, amount=amount, bank_name=bank_name, reference=reference,
                       paid_on=paid, note=request.form.get("note") or None, file_name=name)
    db.session.add(slip)
    db.session.commit()
    return jsonify(slip_dump(slip)), 201


@fees_bp.get("/slips")
@roles_required(*FEE_ROLES)
def list_slips():
    status = request.args.get("status", "pending")
    query = PaymentSlip.query
    if status != "all":
        query = query.filter(PaymentSlip.status == status)
    slips = query.order_by(PaymentSlip.created_at.desc()).limit(200).all()
    return jsonify(slips=[slip_dump(slip) for slip in slips], pending=PaymentSlip.query.filter_by(status="pending").count())


@fees_bp.get("/students/<int:student_id>/slips")
@jwt_required()
def student_slips(student_id):
    viewable_student(student_id)
    slips = PaymentSlip.query.filter_by(student_id=student_id).order_by(PaymentSlip.created_at.desc()).all()
    return jsonify([slip_dump(slip) for slip in slips])


@fees_bp.get("/slips/<int:slip_id>/file")
@jwt_required()
def slip_file(slip_id):
    slip = db.get_or_404(PaymentSlip, slip_id)
    viewable_student(slip.student_id)
    response = send_stored(slip.file_name, private_folder())
    response.headers["Cache-Control"] = "private, no-store"
    return response


@fees_bp.post("/slips/<int:slip_id>/approve")
@roles_required(*FEE_ROLES)
def approve_slip(slip_id):
    slip = db.get_or_404(PaymentSlip, slip_id)
    if slip.status != "pending":
        return jsonify(error="This slip has already been checked"), 400
    data = request.get_json() or {}
    try:
        amount = int(data.get("amount") or slip.amount)
    except (TypeError, ValueError):
        return jsonify(error="Enter the amount as a number"), 400
    if amount < 1 or amount > 1000000:
        return jsonify(error="Enter the amount the bank received"), 400
    if Payment.query.filter(Payment.reference == slip.reference, Payment.status == "completed").first():
        return jsonify(error=f"A payment with reference {slip.reference} is already recorded"), 400
    user = current_user()
    note = "From a slip uploaded by the parent" + (f". Amount corrected from KES {slip.amount:,}" if amount != slip.amount else "")
    payment = ledger.record_payment(slip.student, amount, "Bank", user, reference=slip.reference, paid_on=slip.paid_on,
                                    bank_name=slip.bank_name, note=note, phone=slip.student.parent.phone if slip.student.parent else None)
    slip.status = "approved"
    slip.reviewed_by_id = user.id
    slip.reviewed_at = datetime.now(timezone.utc)
    slip.payment_id = payment.id
    db.session.commit()
    message = receipt_message(payment)
    sms = send_sms([slip.student.parent.phone], message) if slip.student.parent else {"sent": 0, "mode": "none", "recipients": []}
    return jsonify(slip=slip_dump(slip), sms={"message": message, **sms})


@fees_bp.post("/slips/<int:slip_id>/reject")
@roles_required(*FEE_ROLES)
def reject_slip(slip_id):
    slip = db.get_or_404(PaymentSlip, slip_id)
    if slip.status != "pending":
        return jsonify(error="This slip has already been checked"), 400
    data = ReasonSchema().load(request.get_json() or {})
    slip.status = "rejected"
    slip.rejection_reason = data["reason"]
    slip.reviewed_by_id = current_user().id
    slip.reviewed_at = datetime.now(timezone.utc)
    db.session.commit()
    message = (f"Success Academy: We could not confirm the bank slip {slip.reference} of KES {slip.amount:,} for {slip.student.first_name}. "
               f"Reason: {data['reason']}. Please call the bursar's office.")
    sms = send_sms([slip.student.parent.phone], message) if slip.student.parent else {"sent": 0, "mode": "none", "recipients": []}
    return jsonify(slip=slip_dump(slip), sms={"message": message, **sms})
