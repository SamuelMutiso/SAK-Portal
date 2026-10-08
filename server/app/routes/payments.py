from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db, limiter
from app.models import Payment
from app.schemas import PaymentSchema, PayRequestSchema
from app.services.mpesa import request_stk_push
from app.services.sms import send_sms
from app.utils.roles import roles_required, viewable_student

payments_bp = Blueprint("payments", __name__, url_prefix="/api/payments")
schema = PaymentSchema()


def complete_payment(payment, receipt):
    payment.status = "completed"
    payment.receipt = receipt
    student = payment.student
    student.fee_balance = max(0, (student.fee_balance or 0) - payment.amount)
    db.session.commit()
    message = (
        f"Success Academy: Received KES {payment.amount:,} for {student.first_name} ({student.admission_number}). "
        f"Receipt {receipt}. New balance KES {student.fee_balance:,}."
    )
    send_sms([payment.phone], message)


@payments_bp.get("/student/<int:student_id>")
@jwt_required()
def statement(student_id):
    student = viewable_student(student_id)
    payments = sorted(student.payments, key=lambda payment: payment.created_at, reverse=True)
    return jsonify(balance=student.fee_balance, payments=schema.dump(payments, many=True))


@payments_bp.post("/stk")
@roles_required("parent", "admin")
@limiter.limit("5 per minute")
def start_payment():
    data = PayRequestSchema().load(request.get_json() or {})
    student = viewable_student(data["student_id"])
    if data["amount"] > (student.fee_balance or 0):
        return jsonify(error="Amount is more than the fee balance"), 400

    result = request_stk_push(data["phone"], data["amount"], student.admission_number)
    payment = Payment(student_id=student.id, amount=data["amount"], phone=data["phone"], checkout_id=result["checkout_id"])
    db.session.add(payment)
    db.session.commit()

    if result["simulated"]:
        complete_payment(payment, "SIM" + datetime.now().strftime("%H%M%S") + str(payment.id).zfill(3))

    return jsonify(payment=schema.dump(payment), simulated=result["simulated"]), 201


@payments_bp.get("/<int:payment_id>")
@jwt_required()
def payment_status(payment_id):
    payment = db.get_or_404(Payment, payment_id)
    viewable_student(payment.student_id)
    return jsonify(schema.dump(payment))


@payments_bp.post("/callback")
def mpesa_callback():
    callback = (request.get_json(silent=True) or {}).get("Body", {}).get("stkCallback", {})
    payment = Payment.query.filter_by(checkout_id=callback.get("CheckoutRequestID")).first()
    if not payment or payment.status != "pending":
        return jsonify(ResultCode=0, ResultDesc="Accepted")

    if callback.get("ResultCode") == 0:
        items = callback.get("CallbackMetadata", {}).get("Item", [])
        receipt = next((item.get("Value") for item in items if item.get("Name") == "MpesaReceiptNumber"), "")
        complete_payment(payment, receipt)
    else:
        payment.status = "failed"
        db.session.commit()
    return jsonify(ResultCode=0, ResultDesc="Accepted")
