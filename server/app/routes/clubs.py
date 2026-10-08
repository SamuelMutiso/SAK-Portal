from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import Club, Student
from app.schemas import ClubSchema, StudentSchema
from app.utils.roles import roles_required

clubs_bp = Blueprint("clubs", __name__, url_prefix="/api/clubs")
schema = ClubSchema()


@clubs_bp.get("")
@jwt_required()
def list_clubs():
    clubs = Club.query.order_by(Club.name).all()
    return jsonify(schema.dump(clubs, many=True))


@clubs_bp.post("")
@roles_required("admin")
def create_club():
    data = schema.load(request.get_json() or {})
    club = Club(**data)
    db.session.add(club)
    db.session.commit()
    return jsonify(schema.dump(club)), 201


@clubs_bp.get("/<int:club_id>/members")
@roles_required("admin", "teacher")
def list_members(club_id):
    club = db.get_or_404(Club, club_id)
    return jsonify(StudentSchema(many=True).dump(club.students))


@clubs_bp.put("/<int:club_id>/members")
@roles_required("admin")
def set_members(club_id):
    club = db.get_or_404(Club, club_id)
    student_ids = (request.get_json() or {}).get("student_ids", [])
    club.students = Student.query.filter(Student.id.in_(student_ids)).all()
    db.session.commit()
    return jsonify(schema.dump(club))
