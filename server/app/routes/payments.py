import hmac
import time
from datetime import datetime, timedelta

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db, limiter
from app.models import Payment
from app.schemas import PaymentSchema, PayRequestSchema
from app.routes.fees import receipt_message
from app.services import ledger
from app.services.mpesa import MpesaError, callback_token, format_msisdn, is_live, query_stk, request_stk_push, result_message
from app.services.sms import send_sms
from app.utils.roles import current_user, roles_required, viewable_student

payments_bp = Blueprint("payments", __name__, url_prefix="/api/payments")
schema = PaymentSchema()
last_checked = {}


def complete_payment(payment, receipt):
    ledger.complete(payment, receipt)
    db.session.commit()
    send_sms([payment.phone], receipt_message(payment))


def fail_payment(payment, message):
    payment.status = "failed"
    payment.note = message[:200]
    db.session.commit()


def payment_dump(payment):
    row = schema.dump(payment)
    row["student_name"] = payment.student.full_name
    return row


@payments_bp.get("/student/<int:student_id>")
@jwt_required()
def statement(student_id):
    student = viewable_student(student_id)
    payments = sorted(student.payments, key=lambda payment: payment.created_at, reverse=True)
    return jsonify(balance=student.fee_balance, payments=schema.dump(payments, many=True))


@payments_bp.post("/stk")
@roles_required("parent", "admin", "bursar")
@limiter.limit("5 per minute")
def start_payment():
    data = PayRequestSchema().load(request.get_json() or {})
    student = viewable_student(data["student_id"])
    if data["amount"] > (student.fee_balance or 0):
        return jsonify(error="Amount is more than the fee balance"), 400

    allowed = current_app.config["MPESA_ALLOWED_PHONES"]
    if allowed and is_live():
        try:
            wanted = format_msisdn(data["phone"])
            permitted = {format_msisdn(phone) for phone in allowed}
        except MpesaError as error:
            return jsonify(error=str(error)), 400
        if wanted not in permitted:
            return jsonify(error="This demo only sends M-Pesa prompts to approved test numbers."), 403
    try:
        result = request_stk_push(data["phone"], data["amount"], student.admission_number)
    except MpesaError as error:
        return jsonify(error=str(error)), 400 if "Safaricom number" in str(error) else 502

    user = current_user()
    payment = Payment(student_id=student.id, amount=data["amount"], phone=result["phone"], checkout_id=result["checkout_id"], method="M-Pesa",
                      recorded_by_id=user.id if user.role != "parent" else None)
    db.session.add(payment)
    db.session.commit()

    if result["simulated"]:
        complete_payment(payment, "SIM" + datetime.now().strftime("%H%M%S") + str(payment.id).zfill(3))

    return jsonify(payment=payment_dump(payment), simulated=result["simulated"]), 201


def check_with_mpesa(payment):
    if payment.status != "pending" or not is_live() or not payment.checkout_id or payment.checkout_id.startswith("SIM-"):
        return
    age = datetime.utcnow() - payment.created_at
    if age < timedelta(seconds=15) or age > timedelta(hours=24):
        return
    if time.time() - last_checked.get(payment.id, 0) < 10:
        return
    last_checked[payment.id] = time.time()
    try:
        result = query_stk(payment.checkout_id)
    except MpesaError:
        return
    if not result["done"]:
        if age > timedelta(minutes=5):
            fail_payment(payment, "No answer from M-Pesa. If money left your account, the school will confirm it.")
        return
    if result["paid"]:
        payment.note = "Confirmed with M-Pesa. Receipt code to follow."
        complete_payment(payment, None)
    else:
        fail_payment(payment, result["message"])


@payments_bp.get("/<int:payment_id>")
@jwt_required()
def payment_status(payment_id):
    payment = db.get_or_404(Payment, payment_id)
    viewable_student(payment.student_id)
    check_with_mpesa(payment)
    return jsonify(payment_dump(payment))


@payments_bp.post("/callback")
def mpesa_callback():
    if not hmac.compare_digest(request.args.get("token", ""), callback_token()):
        return jsonify(ResultCode=1, ResultDesc="Rejected"), 403
    callback = (request.get_json(silent=True) or {}).get("Body", {}).get("stkCallback", {})
    payment = Payment.query.filter_by(checkout_id=callback.get("CheckoutRequestID")).first()
    if not payment:
        return jsonify(ResultCode=0, ResultDesc="Accepted")

    code = callback.get("ResultCode")
    if code == 0:
        items = callback.get("CallbackMetadata", {}).get("Item", [])
        receipt = next((item.get("Value") for item in items if item.get("Name") == "MpesaReceiptNumber"), "")
        if payment.status in ("pending", "failed"):
            payment.note = None
            complete_payment(payment, receipt)
        elif payment.status == "completed" and not payment.receipt:
            payment.receipt = receipt
            payment.reference = receipt
            payment.note = None
            db.session.commit()
    elif payment.status == "pending":
        fail_payment(payment, result_message(code, callback.get("ResultDesc", "")))
    return jsonify(ResultCode=0, ResultDesc="Accepted")
