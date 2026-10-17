from datetime import date, datetime, timedelta
from io import BytesIO

from flask import Blueprint, jsonify, request, send_file

from app.extensions import db, limiter
from app.models import Expense, Payment
from app.models.expense import CATEGORIES, METHODS
from app.schemas.expense import ExpenseSchema, VoidSchema
from app.services.uploads import DOCUMENTS, looks_like
from app.utils.roles import current_user, roles_required

expenses_bp = Blueprint("expenses", __name__, url_prefix="/api/expenses")
VIEWERS = ("bursar", "admin")
FILE_TYPES = {"pdf": "application/pdf", "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}


def dump(expense):
    return {
        "id": expense.id,
        "spent_on": expense.spent_on.isoformat(),
        "category": expense.category,
        "description": expense.description,
        "amount": expense.amount,
        "paid_to": expense.paid_to,
        "method": expense.method,
        "reference": expense.reference,
        "has_receipt": bool(expense.receipt_name),
        "receipt_name": expense.receipt_name,
        "recorded_by": expense.recorded_by.full_name if expense.recorded_by else None,
        "created_at": expense.created_at.isoformat(),
        "voided": expense.voided_at is not None,
        "voided_by": expense.voided_by.full_name if expense.voided_by else None,
        "voided_at": expense.voided_at.isoformat() if expense.voided_at else None,
        "void_reason": expense.void_reason,
    }


def period():
    today = date.today()
    try:
        end = date.fromisoformat(request.args["end"]) if request.args.get("end") else today
        start = date.fromisoformat(request.args["start"]) if request.args.get("start") else end - timedelta(days=6)
    except ValueError:
        return None, None
    if start > end:
        start, end = end, start
    return max(start, end - timedelta(days=366)), end


@expenses_bp.get("")
@roles_required(*VIEWERS)
def list_expenses():
    start, end = period()
    if not start:
        return jsonify(error="Dates must look like 2026-10-17"), 400
    query = Expense.query.filter(Expense.spent_on >= start, Expense.spent_on <= end)
    category = request.args.get("category")
    if category:
        query = query.filter_by(category=category)
    items = query.order_by(Expense.spent_on.desc(), Expense.id.desc()).all()
    live = [item for item in items if not item.voided_at]
    by_category, by_day = {}, {}
    for item in live:
        by_category[item.category] = by_category.get(item.category, 0) + item.amount
        by_day[item.spent_on.isoformat()] = by_day.get(item.spent_on.isoformat(), 0) + item.amount
    collected = sum(payment.amount for payment in Payment.query.filter_by(status="completed").filter(
        Payment.created_at >= datetime.combine(start - timedelta(days=1), datetime.min.time())).all()
        if start <= (payment.paid_on or payment.created_at.date()) <= end)
    return jsonify(
        start=start.isoformat(),
        end=end.isoformat(),
        total=sum(item.amount for item in live),
        count=len(live),
        without_receipt=sum(1 for item in live if not item.receipt_name),
        voided=sum(1 for item in items if item.voided_at),
        fees_collected=collected,
        by_category=dict(sorted(by_category.items(), key=lambda pair: -pair[1])),
        by_day=dict(sorted(by_day.items())),
        items=[dump(item) for item in items],
        categories=CATEGORIES,
        methods=METHODS,
        can_add=current_user().role == "bursar",
    )


def read_receipt():
    upload = request.files.get("receipt")
    if not upload or not upload.filename:
        return None, None
    extension = upload.filename.rsplit(".", 1)[-1].lower() if "." in upload.filename else ""
    if extension not in DOCUMENTS or not looks_like(upload, extension):
        return None, "The receipt must be a photo (JPG, PNG, WEBP) or a PDF"
    data = upload.read()
    if not data:
        return None, "The receipt file is empty"
    return (upload.filename.replace("\\", "/").rsplit("/", 1)[-1][:150], FILE_TYPES[extension], data), None


@expenses_bp.post("")
@limiter.limit("120 per hour")
@roles_required("bursar")
def add_expense():
    payload = request.form.to_dict() if (request.files or request.form) else (request.get_json() or {})
    payload = {key: (value.strip() if isinstance(value, str) else value) or None for key, value in payload.items() if key in ExpenseSchema().fields}
    data = ExpenseSchema().load(payload)
    if data["method"] != "Cash" and not data.get("reference"):
        return jsonify(error="Add the M-Pesa code, bank reference or cheque number"), 400
    receipt, problem = read_receipt()
    if problem:
        return jsonify(error=problem), 400
    expense = Expense(**data, recorded_by_id=current_user().id)
    if receipt:
        expense.receipt_name, expense.receipt_type, expense.receipt_data = receipt
    db.session.add(expense)
    db.session.commit()
    return jsonify(dump(expense)), 201


@expenses_bp.post("/<int:expense_id>/void")
@roles_required("bursar")
def void_expense(expense_id):
    expense = db.get_or_404(Expense, expense_id)
    if expense.voided_at:
        return jsonify(error="This expense is already cancelled"), 409
    data = VoidSchema().load(request.get_json() or {})
    expense.voided_at = datetime.utcnow()
    expense.voided_by_id = current_user().id
    expense.void_reason = data["reason"].strip()
    db.session.commit()
    return jsonify(dump(expense))


@expenses_bp.get("/<int:expense_id>/receipt")
@roles_required(*VIEWERS)
def expense_receipt(expense_id):
    expense = db.get_or_404(Expense, expense_id)
    if not expense.receipt_data:
        return jsonify(error="Not found"), 404
    response = send_file(BytesIO(expense.receipt_data), mimetype=expense.receipt_type, download_name=expense.receipt_name or "receipt")
    response.headers["Cache-Control"] = "private, no-store"
    return response
