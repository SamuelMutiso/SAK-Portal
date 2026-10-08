from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.curriculum import COMPETENCIES, CURRENT_TERM, LEARNING_AREAS, TERMS, VALUES

meta_bp = Blueprint("meta", __name__, url_prefix="/api/meta")


@meta_bp.get("")
@jwt_required()
def curriculum():
    return jsonify(term=CURRENT_TERM, terms=TERMS, learning_areas=LEARNING_AREAS, competencies=COMPETENCIES, values=VALUES)
