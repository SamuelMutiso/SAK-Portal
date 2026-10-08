from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import Assessment, Student
from app.models.assessment import level_for
from app.schemas import AssessmentSchema, GradeSheetSchema
from app.utils.roles import can_view_student, current_user, roles_required, students_for

assessments_bp = Blueprint("assessments", __name__, url_prefix="/api/assessments")
schema = AssessmentSchema()


def save_assessment(user, student_id, subject, term, exam, score=None, level=None, comment=None):
    record = Assessment.query.filter_by(student_id=student_id, subject=subject, term=term, exam=exam).first()
    if not record:
        record = Assessment(student_id=student_id, subject=subject, term=term, exam=exam)
        db.session.add(record)
    record.score = score
    record.level = level_for(score) if score is not None else level
    record.comment = comment
    record.teacher_id = user.id
    return record


@assessments_bp.get("")
@roles_required("admin", "teacher")
def list_assessments():
    student_ids = [student.id for student in students_for(current_user()).all()]
    query = Assessment.query.filter(Assessment.student_id.in_(student_ids))
    for field in ("subject", "term", "exam"):
        value = request.args.get(field)
        if value:
            query = query.filter(getattr(Assessment, field) == value)
    return jsonify(schema.dump(query.all(), many=True))


@assessments_bp.get("/student/<int:student_id>")
@jwt_required()
def student_assessments(student_id):
    student = db.get_or_404(Student, student_id)
    if not can_view_student(current_user(), student):
        return jsonify(error="You do not have access to this student"), 403
    records = Assessment.query.filter_by(student_id=student_id).order_by(Assessment.term, Assessment.subject).all()
    return jsonify(schema.dump(records, many=True))


@assessments_bp.post("")
@roles_required("admin", "teacher")
def create_assessment():
    user = current_user()
    data = schema.load(request.get_json() or {})
    student = db.get_or_404(Student, data["student_id"])
    if not can_view_student(user, student):
        return jsonify(error="You can only assess students in your class"), 403
    if data.get("score") is None and not data.get("level"):
        return jsonify(error="Enter a score or a level"), 400

    record = save_assessment(
        user, student.id, data["subject"], data["term"], data["exam"],
        score=data.get("score"), level=data.get("level"), comment=data.get("comment"),
    )
    db.session.commit()
    return jsonify(schema.dump(record)), 201


@assessments_bp.post("/sheet")
@roles_required("admin", "teacher")
def save_grade_sheet():
    user = current_user()
    data = GradeSheetSchema().load(request.get_json() or {})
    allowed_ids = {student.id for student in students_for(user).all()}

    saved = []
    for entry in data["scores"]:
        if entry["student_id"] not in allowed_ids:
            continue
        saved.append(save_assessment(user, entry["student_id"], data["subject"], data["term"], data["exam"], score=entry["score"]))

    db.session.commit()
    return jsonify(schema.dump(saved, many=True)), 201
