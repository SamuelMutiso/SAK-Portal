import logging
from datetime import datetime, timedelta, timezone

import requests
from flask import current_app

from app.extensions import db

SANDBOX_URL = "https://api.sandbox.africastalking.com/version1/messaging"
LIVE_URL = "https://api.africastalking.com/version1/messaging"
TEXTBEE_URL = "https://api.textbee.dev/api/v1/gateway/send-sms"


def format_phone(phone):
    phone = phone.replace(" ", "")
    if phone.startswith("0"):
        return "+254" + phone[1:]
    if phone.startswith("254"):
        return "+" + phone
    return phone


def provider():
    if current_app.config.get("TEXTBEE_API_KEY"):
        return "textbee"
    if current_app.config.get("SMS_API_KEY"):
        return "africastalking"
    return None


def live_phones():
    raw = current_app.config.get("SMS_LIVE_PHONES") or ""
    return {item.strip() if item.strip() == "*" else format_phone(item.strip()) for item in raw.split(",") if item.strip()}


def sent_today():
    from app.models import SmsMessage

    since = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=24)
    return SmsMessage.query.filter(SmsMessage.status == "sent", SmsMessage.provider == "textbee", SmsMessage.created_at >= since).count()


def send_textbee(recipients, message):
    body = {"recipients": recipients, "message": message}
    if current_app.config.get("TEXTBEE_DEVICE_ID"):
        body["deviceId"] = current_app.config["TEXTBEE_DEVICE_ID"]
    response = requests.post(TEXTBEE_URL, json=body, headers={"x-api-key": current_app.config["TEXTBEE_API_KEY"]}, timeout=15)
    response.raise_for_status()


def send_africastalking(recipients, message):
    username = current_app.config["SMS_USERNAME"]
    payload = {"username": username, "to": ",".join(recipients), "message": message}
    if current_app.config["SMS_SENDER_ID"]:
        payload["from"] = current_app.config["SMS_SENDER_ID"]
    response = requests.post(
        SANDBOX_URL if username == "sandbox" else LIVE_URL,
        data=payload,
        headers={"apiKey": current_app.config["SMS_API_KEY"], "Accept": "application/json"},
        timeout=15,
    )
    response.raise_for_status()


def plan(recipients, gateway):
    status = {phone: ("preview", None) for phone in recipients}
    if gateway == "africastalking":
        return {phone: ("sent", None) for phone in recipients}
    if gateway != "textbee":
        return status
    allowed = live_phones()
    room = max(0, current_app.config.get("SMS_DAILY_LIMIT", 50) - sent_today())
    for phone in recipients:
        if "*" not in allowed and phone not in allowed:
            continue
        if room <= 0:
            status[phone] = ("skipped", "Daily SMS limit reached")
            continue
        status[phone] = ("sent", None)
        room -= 1
    return status


def send_sms(phones, message, log_message=None):
    from app.models import SmsMessage

    recipients = sorted({format_phone(phone) for phone in phones if phone})
    if not recipients:
        return {"sent": 0, "mode": "none", "recipients": [], "delivered": 0}

    gateway = provider()
    status = plan(recipients, gateway)
    live = [phone for phone, (state, _) in status.items() if state == "sent"]
    if live:
        try:
            (send_textbee if gateway == "textbee" else send_africastalking)(live, message)
        except requests.RequestException as error:
            logging.warning("SMS through %s failed: %s", gateway, error)
            reason = "The SMS phone did not answer" if gateway == "textbee" else "The SMS service did not answer"
            for phone in live:
                status[phone] = ("failed", reason)
    else:
        logging.info("SMS preview to %s recipients (%s characters)", len(recipients), len(message))

    for phone, (state, error) in status.items():
        db.session.add(SmsMessage(phone=phone, message=log_message or message, status=state, provider=gateway if state in ("sent", "failed") else None, error=error))
    db.session.commit()

    delivered = sum(1 for state, _ in status.values() if state == "sent")
    return {"sent": len(recipients), "mode": "live" if delivered else "preview", "recipients": recipients, "delivered": delivered}
