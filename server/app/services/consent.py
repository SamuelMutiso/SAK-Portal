from flask import g, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.extensions import db
from app.policies import POLICY_VERSION

EXEMPT = ("/api/auth/", "/api/consent", "/api/health", "/api/payments/callback", "/api/uploads/")


def needs_consent(user):
    from app.models import Consent

    if user.role == "superadmin":
        return False
    return Consent.query.filter_by(user_id=user.id, version=POLICY_VERSION).first() is None


def consent_gate():
    from app.models import User

    if not request.path.startswith("/api/") or request.path.startswith(EXEMPT) or request.method == "OPTIONS":
        return None
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
    except Exception:
        return None
    if not identity:
        return None
    user = db.session.get(User, int(identity))
    if user and needs_consent(user):
        g.consent_block = True
        return jsonify(error="Please accept the Terms and Privacy Policy to continue", consent_required=True), 403
    return None
