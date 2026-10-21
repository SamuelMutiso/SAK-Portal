from flask import Blueprint, current_app, jsonify, request

from app.extensions import limiter
from app.models import SmsMessage, User
from app.services.sms import format_phone, live_phones, provider, send_sms, sent_today
from app.utils.roles import roles_required

sms_bp = Blueprint("sms", __name__, url_prefix="/api/sms")
TEST_MESSAGE = "Success Academy: this is a test message from the school portal. SMS to parents is working."


def gateway_status():
    gateway = provider()
    allowed = live_phones()
    return {
        "provider": gateway,
        "everyone": "*" in allowed,
        "live_phones": sorted(phone for phone in allowed if phone != "*"),
        "sent_today": sent_today() if gateway == "textbee" else None,
        "daily_limit": current_app.config.get("SMS_DAILY_LIMIT", 50) if gateway == "textbee" else None,
    }


@sms_bp.get("")
@roles_required("admin", "director")
def outbox():
    query = SmsMessage.query
    search = (request.args.get("q") or "").strip()
    if search:
        query = query.filter(SmsMessage.phone.contains(format_phone(search)) | SmsMessage.message.ilike(f"%{search}%"))
    if request.args.get("status") in ("sent", "preview", "failed", "skipped"):
        query = query.filter_by(status=request.args["status"])
    messages = query.order_by(SmsMessage.created_at.desc(), SmsMessage.id.desc()).limit(300).all()
    names = {}
    for user in User.query.filter(User.phone.isnot(None)).all():
        names.setdefault(format_phone(user.phone), user.full_name)
    return jsonify(
        status=gateway_status(),
        messages=[{
            "id": item.id,
            "phone": item.phone,
            "name": names.get(item.phone),
            "message": item.message,
            "status": item.status,
            "error": item.error,
            "created_at": item.created_at.isoformat(),
        } for item in messages],
    )


@sms_bp.post("/test")
@limiter.limit("10 per hour")
@roles_required("admin")
def send_test():
    phone = str((request.get_json() or {}).get("phone") or "").strip()
    digits = format_phone(phone)
    if not (digits.startswith("+254") and len(digits) == 13 and digits[1:].isdigit()):
        return jsonify(error="Enter a Kenyan phone number like 0712 345 678"), 400
    result = send_sms([phone], TEST_MESSAGE)
    latest = SmsMessage.query.filter_by(phone=digits).order_by(SmsMessage.id.desc()).first()
    return jsonify(sms=result, status=latest.status, error=latest.error, gateway=gateway_status())
