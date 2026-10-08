from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.curriculum import BELL_SCHEDULE, DAYS, EXTRA_LESSONS, learning_areas_for
from app.extensions import db
from app.models import Classroom, TimetableSlot
from app.schemas import TimetableSlotSchema
from app.utils.roles import current_user, roles_required, viewable_student

timetable_bp = Blueprint("timetable", __name__, url_prefix="/api/timetable")
schema = TimetableSlotSchema()


def timetable_for(classroom):
    slots = TimetableSlot.query.filter_by(classroom_id=classroom.id).all()
    return {
        "classroom_id": classroom.id,
        "classroom_name": classroom.name,
        "days": DAYS,
        "bells": BELL_SCHEDULE,
        "subjects": learning_areas_for(classroom.level) + EXTRA_LESSONS,
        "slots": schema.dump(slots, many=True),
    }


@timetable_bp.get("/class/<int:classroom_id>")
@roles_required("admin", "teacher")
def class_timetable(classroom_id):
    classroom = db.get_or_404(Classroom, classroom_id)
    user = current_user()
    if user.role == "teacher" and classroom.teacher_id != user.id:
        return jsonify(error="You can only view your own class timetable"), 403
    return jsonify(timetable_for(classroom))


@timetable_bp.get("/student/<int:student_id>")
@jwt_required()
def student_timetable(student_id):
    student = viewable_student(student_id)
    return jsonify(timetable_for(student.classroom))


@timetable_bp.put("/class/<int:classroom_id>")
@roles_required("admin")
def set_slot(classroom_id):
    classroom = db.get_or_404(Classroom, classroom_id)
    data = request.get_json() or {}
    day, period, subject = data.get("day"), data.get("period"), (data.get("subject") or "").strip()
    if day not in range(len(DAYS)) or period not in range(1, 9):
        return jsonify(error="Pick a valid day and lesson"), 400

    slot = TimetableSlot.query.filter_by(classroom_id=classroom.id, day=day, period=period).first()
    if not subject:
        if slot:
            db.session.delete(slot)
            db.session.commit()
        return jsonify(slot=None)
    if not slot:
        slot = TimetableSlot(classroom_id=classroom.id, day=day, period=period)
        db.session.add(slot)
    slot.subject = subject
    db.session.commit()
    return jsonify(slot=schema.dump(slot))
