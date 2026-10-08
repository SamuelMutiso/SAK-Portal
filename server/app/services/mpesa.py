import base64
import uuid
from datetime import datetime

import requests
from flask import current_app

URLS = {
    "sandbox": "https://sandbox.safaricom.co.ke",
    "production": "https://api.safaricom.co.ke",
}


def is_live():
    config = current_app.config
    return bool(config["MPESA_CONSUMER_KEY"] and config["MPESA_CONSUMER_SECRET"] and config["MPESA_PASSKEY"])


def format_msisdn(phone):
    phone = phone.replace(" ", "").replace("+", "")
    if phone.startswith("0"):
        return "254" + phone[1:]
    return phone


def access_token():
    config = current_app.config
    response = requests.get(
        f"{URLS[config['MPESA_ENV']]}/oauth/v1/generate?grant_type=client_credentials",
        auth=(config["MPESA_CONSUMER_KEY"], config["MPESA_CONSUMER_SECRET"]),
        timeout=15,
    )
    response.raise_for_status()
    return response.json()["access_token"]


def request_stk_push(phone, amount, account_reference):
    if not is_live():
        return {"checkout_id": f"SIM-{uuid.uuid4().hex[:12]}", "simulated": True}

    config = current_app.config
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(f"{config['MPESA_SHORTCODE']}{config['MPESA_PASSKEY']}{timestamp}".encode()).decode()
    msisdn = format_msisdn(phone)
    payload = {
        "BusinessShortCode": config["MPESA_SHORTCODE"],
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": amount,
        "PartyA": msisdn,
        "PartyB": config["MPESA_SHORTCODE"],
        "PhoneNumber": msisdn,
        "CallBackURL": config["MPESA_CALLBACK_URL"],
        "AccountReference": account_reference,
        "TransactionDesc": "School fees",
    }
    response = requests.post(
        f"{URLS[config['MPESA_ENV']]}/mpesa/stkpush/v1/processrequest",
        json=payload,
        headers={"Authorization": f"Bearer {access_token()}"},
        timeout=20,
    )
    response.raise_for_status()
    return {"checkout_id": response.json()["CheckoutRequestID"], "simulated": False}
