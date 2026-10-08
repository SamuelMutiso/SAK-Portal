import logging

import requests
from flask import current_app

SANDBOX_URL = "https://api.sandbox.africastalking.com/version1/messaging"
LIVE_URL = "https://api.africastalking.com/version1/messaging"


def format_phone(phone):
    phone = phone.replace(" ", "")
    if phone.startswith("0"):
        return "+254" + phone[1:]
    if phone.startswith("254"):
        return "+" + phone
    return phone


def send_sms(phones, message):
    recipients = sorted({format_phone(phone) for phone in phones if phone})
    if not recipients:
        return {"sent": 0, "mode": "none", "recipients": []}

    api_key = current_app.config["SMS_API_KEY"]
    if not api_key:
        logging.info("SMS preview to %s recipients: %s", len(recipients), message)
        return {"sent": len(recipients), "mode": "preview", "recipients": recipients}

    username = current_app.config["SMS_USERNAME"]
    url = SANDBOX_URL if username == "sandbox" else LIVE_URL
    payload = {"username": username, "to": ",".join(recipients), "message": message}
    if current_app.config["SMS_SENDER_ID"]:
        payload["from"] = current_app.config["SMS_SENDER_ID"]

    response = requests.post(
        url,
        data=payload,
        headers={"apiKey": api_key, "Accept": "application/json"},
        timeout=15,
    )
    response.raise_for_status()
    return {"sent": len(recipients), "mode": "live", "recipients": recipients}
