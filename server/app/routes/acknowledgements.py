from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import Acknowledgement
from app.models.acknowledgement import ITEM_TYPES
from app.utils.roles import current_user

acknowledgements_bp = Blueprint("acknowledgements", __name__, url_prefix="/api/acknowledgements")


@acknowledgements_bp.get("/mine")
@jwt_required()
def mine():
    records = Acknowledgement.query.filter_by(user_id=current_user().id).all()
    return jsonify([f"{record.item_type}:{record.item_id}" for record in records])


@acknowledgements_bp.post("")
@jwt_required()
def acknowledge():
    user = current_user()
    data = request.get_json() or {}
    if data.get("item_type") not in ITEM_TYPES or not isinstance(data.get("item_id"), int):
        return jsonify(error="Unknown item"), 400
    existing = Acknowledgement.query.filter_by(user_id=user.id, item_type=data["item_type"], item_id=data["item_id"]).first()
    if not existing:
        db.session.add(Acknowledgement(user_id=user.id, item_type=data["item_type"], item_id=data["item_id"]))
        db.session.commit()
    return jsonify(key=f"{data['item_type']}:{data['item_id']}"), 201


def seen_counts(item_type, item_ids):
    rows = (
        db.session.query(Acknowledgement.item_id, db.func.count(Acknowledgement.id))
        .filter(Acknowledgement.item_type == item_type, Acknowledgement.item_id.in_(item_ids))
        .group_by(Acknowledgement.item_id)
        .all()
    )
    return dict(rows)
