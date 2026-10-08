from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import Consent
from app.policies import POLICY_VERSION
from app.services.audit import client_ip
from app.utils.roles import current_user

consent_bp = Blueprint("consent", __name__, url_prefix="/api/consent")


def consent_dump(consent):
    if not consent:
        return None
    return {
        "version": consent.version,
        "accepted_at": consent.accepted_at.isoformat(),
        "signature": consent.signature,
        "child_data": consent.child_data,
        "photo_consent": consent.photo_consent,
        "ip_address": consent.ip_address,
    }


@consent_bp.get("")
@jwt_required()
def status():
    user = current_user()
    latest = Consent.query.filter_by(user_id=user.id).order_by(Consent.id.desc()).first()
    return jsonify(
        version=POLICY_VERSION,
        accepted=bool(latest and latest.version == POLICY_VERSION),
        is_parent=user.role == "parent",
        full_name=user.full_name,
        latest=consent_dump(latest),
    )


@consent_bp.post("")
@jwt_required()
def accept():
    user = current_user()
    data = request.get_json() or {}
    signature = " ".join(str(data.get("signature", "")).split())
    if not data.get("accept_terms") or not data.get("accept_privacy"):
        return jsonify(error="You need to accept both the Terms of Use and the Privacy Policy"), 400
    if len(signature) < 3:
        return jsonify(error="Type your full name to sign"), 400
    if user.role == "parent" and not data.get("child_data"):
        return jsonify(error="As a parent, you need to allow the school to process your child's information to use the portal"), 400

    photo = bool(data.get("photo_consent")) if user.role == "parent" else None
    consent = Consent(
        user_id=user.id,
        version=POLICY_VERSION,
        accepted_terms=True,
        accepted_privacy=True,
        child_data=True if user.role == "parent" else None,
        photo_consent=photo,
        signature=signature,
        ip_address=client_ip(),
        user_agent=request.headers.get("User-Agent", "")[:400],
    )
    db.session.add(consent)
    if user.role == "parent":
        user.photo_consent = photo
    db.session.commit()
    return jsonify(consent_dump(consent)), 201
