from flask import Blueprint, jsonify, request

from app.extensions import db
from app.models import User
from app.schemas import UserCreateSchema, UserSchema
from app.utils.roles import roles_required

users_bp = Blueprint("users", __name__, url_prefix="/api/users")


@users_bp.get("")
@roles_required("admin")
def list_users():
    query = User.query.filter(User.role != "superadmin").order_by(User.full_name)
    role = request.args.get("role")
    if role:
        query = query.filter_by(role=role)
    return jsonify(UserSchema(many=True).dump(query.all()))


@users_bp.post("")
@roles_required("admin")
def create_user():
    data = UserCreateSchema().load(request.get_json() or {})
    if data["role"] == "superadmin":
        return jsonify(error="Only the school director can create director accounts"), 403
    email = data["email"].lower()
    if User.query.filter_by(email=email).first():
        return jsonify(error="Email already in use"), 409
    user = User(full_name=data["full_name"], email=email, phone=data["phone"], role=data["role"])
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()
    return jsonify(UserSchema().dump(user)), 201


@users_bp.patch("/<int:user_id>")
@roles_required("admin")
def update_user(user_id):
    user = db.get_or_404(User, user_id)
    if user.role == "superadmin":
        return jsonify(error="Director accounts can only be changed by the director"), 403
    data = request.get_json() or {}
    for field in ("full_name", "phone", "is_active"):
        if field in data:
            setattr(user, field, data[field])
    if data.get("password"):
        user.set_password(data["password"])
    db.session.commit()
    return jsonify(UserSchema().dump(user))
