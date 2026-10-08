from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import Classroom, Club, ClubActivity, Student
from app.schemas import ClubActivitySchema, ClubSchema, StudentSchema
from app.utils.roles import current_user, roles_required

clubs_bp = Blueprint("clubs", __name__, url_prefix="/api/clubs")
schema = ClubSchema()
activity_schema = ClubActivitySchema()


def can_manage(club):
    user = current_user()
    return user.role == "admin" or club.patron_id == user.id


def is_class_teacher(user, student):
    return user.role == "admin" or (user.role == "teacher" and student.classroom is not None and student.classroom.teacher_id == user.id)


def can_change_member(club, student):
    return can_manage(club) or is_class_teacher(current_user(), student)


def drop_from(club, student_id):
    club.students = [student for student in club.students if student.id != student_id]
    if club.leader_id == student_id:
        club.leader_id = None


def learner_row(student):
    return {
        "id": student.id,
        "full_name": student.full_name,
        "admission_number": student.admission_number,
        "club_ids": sorted(club.id for club in student.clubs),
    }


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


@clubs_bp.get("/class")
@roles_required("admin", "teacher")
def class_clubs():
    user = current_user()
    if user.role == "teacher":
        classroom = Classroom.query.filter_by(teacher_id=user.id).first()
        if not classroom:
            return jsonify(error="You are not a class teacher"), 403
    else:
        classroom_id = request.args.get("classroom_id", type=int)
        classroom = db.get_or_404(Classroom, classroom_id) if classroom_id else Classroom.query.order_by(Classroom.id).first()
    learners = sorted(classroom.students, key=lambda student: student.first_name)
    clubs = Club.query.order_by(Club.name).all()
    return jsonify(
        classroom={"id": classroom.id, "name": classroom.name},
        clubs=[{"id": club.id, "name": club.name, "members": len(club.students),
                "from_class": sum(1 for student in club.students if student.classroom_id == classroom.id)} for club in clubs],
        learners=[learner_row(student) for student in learners],
    )


@clubs_bp.put("/learner/<int:student_id>")
@roles_required("admin", "teacher")
def set_learner_clubs(student_id):
    student = db.get_or_404(Student, student_id)
    if not is_class_teacher(current_user(), student):
        return jsonify(error="Only the class teacher can change this learner's clubs"), 403
    wanted = set((request.get_json() or {}).get("club_ids", []))
    for club in list(student.clubs):
        if club.id not in wanted:
            drop_from(club, student.id)
    for club in Club.query.filter(Club.id.in_(wanted)).all():
        if student not in club.students:
            club.students.append(student)
    db.session.commit()
    return jsonify(learner_row(student))


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
        editable_ids=[student.id for student in members if can_change_member(club, student)],
        is_class_teacher=bool(current_user().classroom) if current_user().role == "teacher" else False,
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
    admission = str((request.get_json() or {}).get("admission_number", "")).strip().upper()
    student = Student.query.filter_by(admission_number=admission).first()
    if not student:
        return jsonify(error="No learner with that admission number"), 404
    if not can_change_member(club, student):
        return jsonify(error="You can only add learners from your own class"), 403
    if student not in club.students:
        club.students.append(student)
        db.session.commit()
    return jsonify(StudentSchema().dump(student)), 201


@clubs_bp.delete("/<int:club_id>/members/<int:student_id>")
@roles_required("admin", "teacher")
def remove_member(club_id, student_id):
    club = db.get_or_404(Club, club_id)
    student = db.get_or_404(Student, student_id)
    if not can_change_member(club, student):
        return jsonify(error="You can only remove learners from your own class"), 403
    drop_from(club, student_id)
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
