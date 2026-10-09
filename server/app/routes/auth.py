from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, jwt_required

from app.extensions import db, limiter
from app.models import Consent, User
from app.schemas import LoginSchema, UserSchema
from app.services.audit import write_log
from app.services.consent import needs_consent
from app.utils.roles import current_user

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

ROLE_NAMES = {
    "superadmin": "System owner",
    "director": "Director",
    "admin": "School office",
    "exams": "Exams officer",
    "teacher": "Teacher",
    "parent": "Parent",
    "driver": "Bus driver",
}


def user_payload(user):
    data = UserSchema().dump(user)
    data["consent_required"] = needs_consent(user)
    return data


def tokens_for(user):
    claims = {"role": user.role, "name": user.full_name}
    return {
        "access_token": create_access_token(identity=str(user.id), additional_claims=claims),
        "refresh_token": create_refresh_token(identity=str(user.id)),
        "user": user_payload(user),
    }


@auth_bp.post("/login")
@limiter.limit("5 per minute")
def login():
    data = LoginSchema().load(request.get_json() or {})
    email = data["email"].lower()
    user = User.query.filter_by(email=email).first()
    if not user or user.removed_at or not user.check_password(data["password"]):
        write_log("login_failed", f"Failed sign-in for {email}", user=user, status=401, user_name=email)
        return jsonify(error="Invalid email or password"), 401
    if not user.is_active:
        write_log("login_failed", "Sign-in blocked: account switched off", user=user, status=401)
        return jsonify(error="This account has been switched off. Contact the school office."), 401
    expected = data["role"]
    if expected and expected != user.role:
        label = ROLE_NAMES.get(user.role, user.role)
        write_log("login_failed", f"Signed in through the wrong door (chose {ROLE_NAMES.get(expected, expected)})", user=user, status=401)
        return jsonify(error=f"This is a {label} account. Go back and choose {label}.", role=user.role), 401
    if current_app.config["DEMO_MODE"] and user.role == "parent":
        reset_consent(user)
    write_log("login", "Signed in", user=user, status=200)
    return jsonify(tokens_for(user))


def reset_consent(user):
    Consent.query.filter_by(user_id=user.id).delete()
    user.photo_consent = None
    db.session.commit()


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user or not user.is_active:
        return jsonify(error="Account not found"), 401
    claims = {"role": user.role, "name": user.full_name}
    return jsonify(access_token=create_access_token(identity=str(user.id), additional_claims=claims))


@auth_bp.get("/me")
@jwt_required()
def me():
    return jsonify(user_payload(current_user()))
