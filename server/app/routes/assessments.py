from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import Assessment, Student
from app.schemas import AssessmentSchema
from app.utils.roles import can_view_student, current_user, roles_required

assessments_bp = Blueprint("assessments", __name__, url_prefix="/api/assessments")
schema = AssessmentSchema()


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

    record = Assessment.query.filter_by(
        student_id=student.id, subject=data["subject"], term=data["term"]
    ).first()
    if not record:
        record = Assessment(student_id=student.id, subject=data["subject"], term=data["term"])
        db.session.add(record)
    record.level = data["level"]
    record.comment = data.get("comment")
    record.teacher_id = user.id
    db.session.commit()
    return jsonify(schema.dump(record)), 201
