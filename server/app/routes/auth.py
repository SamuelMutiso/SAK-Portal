import secrets
from datetime import datetime, timedelta, timezone

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, jwt_required

from app.extensions import bcrypt, db, limiter
from app.models import Consent, PasswordReset, User
from app.schemas import LoginSchema, UserSchema
from app.services.audit import write_log
from app.services.consent import needs_consent
from app.services.sms import send_sms
from app.utils.accounts import find_account, password_problem
from app.utils.roles import current_user

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

ROLE_NAMES = {
    "superadmin": "System owner",
    "director": "Director",
    "admin": "School office",
    "exams": "Exams officer",
    "bursar": "Bursar",
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
    email = data["email"].strip().lower()
    user = find_account(email)
    if not user or user.removed_at or not user.check_password(data["password"]):
        write_log("login_failed", f"Failed sign-in for {email}", user=user, status=401, user_name=email)
        return jsonify(error="Wrong email, phone number or password"), 401
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


@auth_bp.post("/change-password")
@jwt_required()
@limiter.limit("10 per hour")
def change_password():
    user = current_user()
    data = request.get_json() or {}
    if not user.check_password(data.get("current_password", "")):
        return jsonify(error="Your current password is not right"), 400
    new = data.get("new_password", "")
    problem = password_problem(new)
    if problem:
        return jsonify(error=problem), 400
    if user.check_password(new):
        return jsonify(error="Choose a password different from the old one"), 400
    user.set_password(new)
    user.must_change_password = False
    db.session.commit()
    return jsonify(user=user_payload(user))


@auth_bp.post("/forgot")
@limiter.limit("3 per 10 minutes")
def forgot_password():
    login_name = (request.get_json() or {}).get("login", "")
    user = find_account(login_name)
    reply = {"message": "If that account exists, a 6-digit code has been sent to its phone number."}
    if not user or user.removed_at or not user.is_active or not user.phone:
        return jsonify(reply)
    PasswordReset.query.filter_by(user_id=user.id, used_at=None).update({PasswordReset.used_at: datetime.now(timezone.utc)})
    code = f"{secrets.randbelow(1000000):06d}"
    db.session.add(PasswordReset(user_id=user.id, code_hash=bcrypt.generate_password_hash(code).decode("utf-8"),
                                 expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=10)))
    db.session.commit()
    message = f"Success Academy: Your password reset code is {code}. It expires in 10 minutes. If you did not ask for it, ignore this message."
    sms = send_sms([user.phone], message)
    if sms["mode"] == "preview":
        reply["sms"] = {"message": message, **sms}
    return jsonify(reply)


@auth_bp.post("/reset")
@limiter.limit("10 per 10 minutes")
def reset_password():
    data = request.get_json() or {}
    user = find_account(data.get("login", ""))
    wrong = jsonify(error="That code is wrong or has expired. Ask for a new one."), 400
    if not user:
        return wrong
    reset = PasswordReset.query.filter_by(user_id=user.id, used_at=None).order_by(PasswordReset.id.desc()).first()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if not reset or reset.expires_at < now or reset.attempts >= 5:
        return wrong
    if not bcrypt.check_password_hash(reset.code_hash, str(data.get("code", "")).strip()):
        reset.attempts += 1
        db.session.commit()
        return wrong
    problem = password_problem(data.get("new_password", ""))
    if problem:
        return jsonify(error=problem), 400
    user.set_password(data["new_password"])
    user.must_change_password = False
    reset.used_at = now
    db.session.commit()
    return jsonify(message="Password changed. You can sign in now.")


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
