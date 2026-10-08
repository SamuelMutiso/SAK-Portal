from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, jwt_required

from app.extensions import db, limiter
from app.models import User
from app.schemas import LoginSchema, UserSchema
from app.utils.roles import current_user

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def tokens_for(user):
    claims = {"role": user.role, "name": user.full_name}
    return {
        "access_token": create_access_token(identity=str(user.id), additional_claims=claims),
        "refresh_token": create_refresh_token(identity=str(user.id)),
        "user": UserSchema().dump(user),
    }


@auth_bp.post("/login")
@limiter.limit("5 per minute")
def login():
    data = LoginSchema().load(request.get_json() or {})
    user = User.query.filter_by(email=data["email"].lower()).first()
    if not user or not user.is_active or not user.check_password(data["password"]):
        return jsonify(error="Invalid email or password"), 401
    return jsonify(tokens_for(user))


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
    return jsonify(UserSchema().dump(current_user()))
