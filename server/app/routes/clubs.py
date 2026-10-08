from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import Club, ClubActivity, Student
from app.schemas import ClubActivitySchema, ClubSchema, StudentSchema
from app.utils.roles import current_user, roles_required

clubs_bp = Blueprint("clubs", __name__, url_prefix="/api/clubs")
schema = ClubSchema()
activity_schema = ClubActivitySchema()


def can_manage(club):
    user = current_user()
    return user.role == "admin" or club.patron_id == user.id


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


@clubs_bp.get("/<int:club_id>")
@roles_required("admin", "teacher")
def club_detail(club_id):
    club = db.get_or_404(Club, club_id)
    members = sorted(club.students, key=lambda student: (student.classroom_id or 0, student.first_name))
    return jsonify(
        club=schema.dump(club),
        members=StudentSchema(many=True).dump(members),
        activities=activity_schema.dump(club.activities, many=True),
        can_manage=can_manage(club),
    )


@clubs_bp.patch("/<int:club_id>")
@roles_required("admin", "teacher")
def update_club(club_id):
    club = db.get_or_404(Club, club_id)
    if not can_manage(club):
        return jsonify(error="Only the patron or admin can edit this club"), 403
    data = request.get_json() or {}
    if "leader_id" in data and data["leader_id"] and data["leader_id"] not in {student.id for student in club.students}:
        return jsonify(error="The leader must be a club member"), 400
    for field in ("description", "meeting_day", "venue", "leader_id"):
        if field in data:
            setattr(club, field, data[field])
    if "patron_id" in data and current_user().role == "admin":
        club.patron_id = data["patron_id"]
    db.session.commit()
    return jsonify(schema.dump(club))


@clubs_bp.get("/<int:club_id>/members")
@roles_required("admin", "teacher")
def list_members(club_id):
    club = db.get_or_404(Club, club_id)
    return jsonify(StudentSchema(many=True).dump(club.students))


@clubs_bp.post("/<int:club_id>/members")
@roles_required("admin", "teacher")
def add_member(club_id):
    club = db.get_or_404(Club, club_id)
    if not can_manage(club):
        return jsonify(error="Only the patron or admin can add members"), 403
    admission = str((request.get_json() or {}).get("admission_number", "")).upper()
    student = Student.query.filter_by(admission_number=admission).first()
    if not student:
        return jsonify(error="No learner with that admission number"), 404
    if student not in club.students:
        club.students.append(student)
        db.session.commit()
    return jsonify(StudentSchema().dump(student)), 201


@clubs_bp.delete("/<int:club_id>/members/<int:student_id>")
@roles_required("admin", "teacher")
def remove_member(club_id, student_id):
    club = db.get_or_404(Club, club_id)
    if not can_manage(club):
        return jsonify(error="Only the patron or admin can remove members"), 403
    club.students = [student for student in club.students if student.id != student_id]
    if club.leader_id == student_id:
        club.leader_id = None
    db.session.commit()
    return "", 204


@clubs_bp.put("/<int:club_id>/members")
@roles_required("admin")
def set_members(club_id):
    club = db.get_or_404(Club, club_id)
    student_ids = (request.get_json() or {}).get("student_ids", [])
    club.students = Student.query.filter(Student.id.in_(student_ids)).all()
    db.session.commit()
    return jsonify(schema.dump(club))


@clubs_bp.post("/<int:club_id>/activities")
@roles_required("admin", "teacher")
def add_activity(club_id):
    club = db.get_or_404(Club, club_id)
    if not can_manage(club):
        return jsonify(error="Only the patron or admin can add activities"), 403
    data = activity_schema.load(request.get_json() or {})
    activity = ClubActivity(club_id=club.id, **data)
    db.session.add(activity)
    db.session.commit()
    return jsonify(activity_schema.dump(activity)), 201


@clubs_bp.delete("/activities/<int:activity_id>")
@roles_required("admin", "teacher")
def delete_activity(activity_id):
    activity = db.get_or_404(ClubActivity, activity_id)
    if not can_manage(activity.club):
        return jsonify(error="Only the patron or admin can remove activities"), 403
    db.session.delete(activity)
    db.session.commit()
    return "", 204
