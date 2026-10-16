import base64
import hashlib
import hmac
import time
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

import requests
from flask import current_app

URLS = {
    "sandbox": "https://sandbox.safaricom.co.ke",
    "production": "https://api.safaricom.co.ke",
}

RESULT_MESSAGES = {
    1: "There is not enough money in that M-Pesa account.",
    1032: "The M-Pesa prompt was cancelled on the phone.",
    1037: "The prompt timed out before the PIN was entered. Check that the phone is on and try again.",
    2001: "The M-Pesa PIN was wrong. Please try again.",
    1025: "M-Pesa could not send the prompt. Please try again.",
    9999: "M-Pesa could not send the prompt. Please try again.",
}

_token = {"value": None, "expires": 0}


class MpesaError(Exception):
    pass


def is_live():
    config = current_app.config
    return bool(config["MPESA_CONSUMER_KEY"] and config["MPESA_CONSUMER_SECRET"] and config["MPESA_PASSKEY"])


def base_url():
    return URLS[current_app.config["MPESA_ENV"]]


def format_msisdn(phone):
    digits = "".join(character for character in str(phone) if character.isdigit())
    if digits.startswith("0"):
        digits = "254" + digits[1:]
    elif len(digits) == 9:
        digits = "254" + digits
    if len(digits) != 12 or not digits.startswith(("2547", "2541")):
        raise MpesaError("Enter a Safaricom number like 0712 345 678")
    return digits


def callback_token():
    secret = current_app.config["SECRET_KEY"].encode()
    return hmac.new(secret, b"mpesa-callback", hashlib.sha256).hexdigest()[:32]


def callback_url():
    return f"{current_app.config['MPESA_CALLBACK_URL']}?token={callback_token()}"


def result_message(code, description=""):
    if "debitparty" in str(description).lower().replace(" ", ""):
        return "That number is not an active M-Pesa line. Check the number and try again."
    try:
        code = int(code)
    except (TypeError, ValueError):
        return description or "M-Pesa did not complete the payment."
    return RESULT_MESSAGES.get(code, description or "M-Pesa did not complete the payment.")


def daraja_error(response):
    try:
        data = response.json()
    except ValueError:
        return f"M-Pesa is not responding right now (error {response.status_code}). Please try again."
    return data.get("errorMessage") or data.get("ResponseDescription") or "M-Pesa rejected the request."


def access_token():
    if _token["value"] and _token["expires"] > time.time():
        return _token["value"]
    config = current_app.config
    try:
        response = requests.get(
            f"{base_url()}/oauth/v1/generate?grant_type=client_credentials",
            auth=(config["MPESA_CONSUMER_KEY"], config["MPESA_CONSUMER_SECRET"]),
            timeout=15,
        )
    except requests.RequestException:
        raise MpesaError("Could not reach M-Pesa. Please try again in a minute.")
    if response.status_code != 200:
        raise MpesaError("M-Pesa did not accept the school's API keys. Please tell the school office.")
    data = response.json()
    _token["value"] = data["access_token"]
    _token["expires"] = time.time() + int(data.get("expires_in", 3599)) - 60
    return _token["value"]


def password_and_timestamp():
    config = current_app.config
    timestamp = datetime.now(ZoneInfo("Africa/Nairobi")).strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(f"{config['MPESA_SHORTCODE']}{config['MPESA_PASSKEY']}{timestamp}".encode()).decode()
    return password, timestamp


def post(path, payload):
    try:
        return requests.post(f"{base_url()}{path}", json=payload, headers={"Authorization": f"Bearer {access_token()}"}, timeout=20)
    except requests.RequestException:
        raise MpesaError("Could not reach M-Pesa. Please try again in a minute.")


def request_stk_push(phone, amount, account_reference):
    msisdn = format_msisdn(phone)
    if not is_live():
        return {"checkout_id": f"SIM-{uuid.uuid4().hex[:12]}", "simulated": True, "phone": msisdn}

    config = current_app.config
    password, timestamp = password_and_timestamp()
    response = post("/mpesa/stkpush/v1/processrequest", {
        "BusinessShortCode": config["MPESA_SHORTCODE"],
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(amount),
        "PartyA": msisdn,
        "PartyB": config["MPESA_SHORTCODE"],
        "PhoneNumber": msisdn,
        "CallBackURL": callback_url(),
        "AccountReference": account_reference[:12],
        "TransactionDesc": "School fees",
    })
    data = response.json() if response.headers.get("Content-Type", "").startswith("application/json") else {}
    if response.status_code != 200 or str(data.get("ResponseCode")) != "0":
        raise MpesaError(daraja_error(response))
    return {"checkout_id": data["CheckoutRequestID"], "simulated": False, "phone": msisdn}


def query_stk(checkout_id):
    config = current_app.config
    password, timestamp = password_and_timestamp()
    response = post("/mpesa/stkpushquery/v1/query", {
        "BusinessShortCode": config["MPESA_SHORTCODE"],
        "Password": password,
        "Timestamp": timestamp,
        "CheckoutRequestID": checkout_id,
    })
    data = response.json() if response.headers.get("Content-Type", "").startswith("application/json") else {}
    try:
        code = int(data["ResultCode"])
    except (KeyError, TypeError, ValueError):
        return {"done": False}
    return {"done": True, "paid": code == 0, "message": result_message(code, data.get("ResultDesc", ""))}
