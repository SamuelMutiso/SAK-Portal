from datetime import date

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import Attendance, Student
from app.schemas import AttendanceBatchSchema, AttendanceSchema
from app.utils.roles import can_view_student, current_user, roles_required, students_for

attendance_bp = Blueprint("attendance", __name__, url_prefix="/api/attendance")
schema = AttendanceSchema()


@attendance_bp.get("")
@roles_required("admin", "teacher")
def list_attendance():
    day = request.args.get("date", default=date.today().isoformat())
    query = Attendance.query.join(Student).filter(Attendance.date == date.fromisoformat(day))
    classroom_id = request.args.get("classroom_id", type=int)
    if classroom_id:
        query = query.filter(Student.classroom_id == classroom_id)
    return jsonify(schema.dump(query.all(), many=True))


@attendance_bp.get("/student/<int:student_id>")
@jwt_required()
def student_attendance(student_id):
    student = db.get_or_404(Student, student_id)
    if not can_view_student(current_user(), student):
        return jsonify(error="You do not have access to this student"), 403
    records = Attendance.query.filter_by(student_id=student_id).order_by(Attendance.date.desc()).limit(60).all()
    return jsonify(schema.dump(records, many=True))


@attendance_bp.post("")
@roles_required("admin", "teacher")
def mark_attendance():
    user = current_user()
    data = AttendanceBatchSchema().load(request.get_json() or {})
    allowed_ids = {student.id for student in students_for(user).all()}

    saved = []
    for entry in data["records"]:
        if entry["student_id"] not in allowed_ids:
            continue
        record = Attendance.query.filter_by(student_id=entry["student_id"], date=data["date"]).first()
        if not record:
            record = Attendance(student_id=entry["student_id"], date=data["date"])
            db.session.add(record)
        record.status = entry["status"]
        record.recorded_by_id = user.id
        saved.append(record)

    db.session.commit()
    return jsonify(schema.dump(saved, many=True)), 201
