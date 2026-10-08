from datetime import date

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import DiaryEntry
from app.schemas import DiarySchema, DiarySheetSchema
from app.utils.roles import current_user, roles_required, students_for, viewable_student

diary_bp = Blueprint("diary", __name__, url_prefix="/api/diary")
schema = DiarySchema()


@diary_bp.get("")
@roles_required("admin", "teacher")
def class_diary():
    day = date.fromisoformat(request.args.get("date", date.today().isoformat()))
    student_ids = [student.id for student in students_for(current_user()).all()]
    entries = DiaryEntry.query.filter(DiaryEntry.student_id.in_(student_ids), DiaryEntry.date == day).all()
    return jsonify(schema.dump(entries, many=True))


@diary_bp.post("")
@roles_required("admin", "teacher")
def save_diary():
    user = current_user()
    data = DiarySheetSchema().load(request.get_json() or {})
    allowed_ids = {student.id for student in students_for(user).all()}
    saved = []
    for row in data["entries"]:
        if row["student_id"] not in allowed_ids:
            continue
        entry = DiaryEntry.query.filter_by(student_id=row["student_id"], date=data["date"]).first()
        if not entry:
            entry = DiaryEntry(student_id=row["student_id"], date=data["date"])
            db.session.add(entry)
        for field in ("meals", "nap", "mood", "activities", "note"):
            setattr(entry, field, row.get(field))
        entry.teacher_id = user.id
        saved.append(entry)
    db.session.commit()
    return jsonify(schema.dump(saved, many=True)), 201


@diary_bp.get("/student/<int:student_id>")
@jwt_required()
def student_diary(student_id):
    viewable_student(student_id)
    entries = DiaryEntry.query.filter_by(student_id=student_id).order_by(DiaryEntry.date.desc()).limit(10).all()
    return jsonify(schema.dump(entries, many=True))
