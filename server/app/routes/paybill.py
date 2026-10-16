import hmac
from datetime import datetime

from flask import Blueprint, current_app, jsonify, request

from app.extensions import db, limiter
from app.models import PaybillReceipt, Student
from app.routes.fees import receipt_message
from app.services.mpesa import callback_token
from app.services.paybill import assign, demo_code, receive
from app.services.sms import send_sms
from app.utils.roles import current_user, roles_required

paybill_bp = Blueprint("paybill", __name__, url_prefix="/api/paybill")
FEE_ROLES = ("admin", "bursar")


def receipt_dump(receipt):
    payment = receipt.payment
    return {
        "id": receipt.id, "trans_id": receipt.trans_id, "amount": receipt.amount, "phone": receipt.phone, "payer_name": receipt.payer_name,
        "account": receipt.account, "received_at": receipt.received_at.isoformat(), "matched": payment is not None,
        "student_id": payment.student_id if payment else None, "student_name": payment.student.full_name if payment else None,
        "admission_number": payment.student.admission_number if payment else None,
        "payment_id": payment.id if payment else None, "receipt_number": payment.receipt_number if payment else None,
        "assigned_by": receipt.assigned_by.full_name if receipt.assigned_by else ("Matched automatically" if payment else None),
    }


def notify(payment):
    if payment and payment.student.parent:
        message = receipt_message(payment)
        return {"message": message, **send_sms([payment.student.parent.phone], message)}
    return None


def signed():
    return hmac.compare_digest(request.args.get("token", ""), callback_token())


@paybill_bp.post("/validation")
def validation():
    if not signed():
        return jsonify(ResultCode="C2B00016", ResultDesc="Rejected"), 403
    return jsonify(ResultCode="0", ResultDesc="Accepted")


@paybill_bp.post("/confirmation")
def confirmation():
    if not signed():
        return jsonify(ResultCode=1, ResultDesc="Rejected"), 403
    receipt, payment = receive(request.get_json(silent=True) or {})
    db.session.commit()
    notify(payment)
    return jsonify(ResultCode=0, ResultDesc="Accepted")


@paybill_bp.get("/receipts")
@roles_required(*FEE_ROLES)
def list_receipts():
    query = PaybillReceipt.query
    status = request.args.get("status", "unmatched")
    if status == "unmatched":
        query = query.filter(PaybillReceipt.payment_id.is_(None))
    elif status == "matched":
        query = query.filter(PaybillReceipt.payment_id.isnot(None))
    receipts = query.order_by(PaybillReceipt.received_at.desc()).limit(200).all()
    return jsonify(receipts=[receipt_dump(receipt) for receipt in receipts],
                   unmatched=PaybillReceipt.query.filter(PaybillReceipt.payment_id.is_(None)).count(),
                   simulation=current_app.config["PAYBILL_SIMULATION"])


@paybill_bp.post("/receipts/<int:receipt_id>/assign")
@roles_required(*FEE_ROLES)
def assign_receipt(receipt_id):
    receipt = db.get_or_404(PaybillReceipt, receipt_id)
    if receipt.payment_id:
        return jsonify(error="This payment is already matched to a learner"), 400
    student = db.get_or_404(Student, (request.get_json() or {}).get("student_id") or 0)
    payment = assign(receipt, student, current_user())
    db.session.commit()
    return jsonify(receipt=receipt_dump(receipt), sms=notify(payment))


@paybill_bp.post("/simulate")
@limiter.limit("30 per hour")
@roles_required(*FEE_ROLES)
def simulate():
    if not current_app.config["PAYBILL_SIMULATION"]:
        return jsonify(error="Paybill simulation is off"), 403
    data = request.get_json() or {}
    try:
        amount = int(data.get("amount") or 0)
    except (TypeError, ValueError):
        amount = 0
    if amount < 1 or amount > 1000000 or not str(data.get("account", "")).strip():
        return jsonify(error="Enter the account number and amount"), 400
    name = str(data.get("name") or "Demo Parent").split()
    receipt, payment = receive({
        "TransID": demo_code(), "TransAmount": amount, "MSISDN": data.get("phone") or "254700000000",
        "FirstName": name[0], "LastName": " ".join(name[1:]), "BillRefNumber": data["account"],
        "TransTime": datetime.now().strftime("%Y%m%d%H%M%S"),
    })
    db.session.commit()
    return jsonify(receipt=receipt_dump(receipt), sms=notify(payment)), 201
