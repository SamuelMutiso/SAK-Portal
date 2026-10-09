from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.curriculum import COMPETENCIES, LEARNING_AREAS, TERMS, VALUES, YEARS, current_term

meta_bp = Blueprint("meta", __name__, url_prefix="/api/meta")


@meta_bp.get("")
@jwt_required()
def curriculum():
    return jsonify(term=current_term(), terms=TERMS, years=YEARS, learning_areas=LEARNING_AREAS, competencies=COMPETENCIES, values=VALUES)
