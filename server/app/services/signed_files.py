from flask import current_app
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

MAX_AGE = 6 * 60 * 60


def _serializer():
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt="uploaded-file")


def signed_url(url):
    if not url or not url.startswith("/api/uploads/"):
        return url
    name = url.removeprefix("/api/uploads/")
    return f"{url}?sig={_serializer().dumps(name)}"


def signature_ok(name, signature):
    try:
        return _serializer().loads(signature or "", max_age=MAX_AGE) == name
    except (BadSignature, SignatureExpired):
        return False
