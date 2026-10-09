from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import Classroom
from app.services.insights import class_insights, compare_classes, student_insights
from app.utils.roles import current_user, roles_required, viewable_student

insights_bp = Blueprint("insights", __name__, url_prefix="/api/insights")


@insights_bp.get("/class")
@roles_required("admin", "teacher", "exams")
def for_class():
    user = current_user()
    classroom_id = request.args.get("classroom_id", type=int)
    if user.role == "teacher":
        classroom = Classroom.query.filter_by(teacher_id=user.id).first()
        if not classroom or (classroom_id and classroom_id != classroom.id):
            return jsonify(error="You can only see insights for your own class"), 403
    else:
        classroom = db.get_or_404(Classroom, classroom_id) if classroom_id else Classroom.query.order_by(Classroom.id).first()
    return jsonify(class_insights(classroom, request.args.get("term"), request.args.get("exam")))


@insights_bp.get("/student/<int:student_id>")
@jwt_required()
def for_student(student_id):
    student = viewable_student(student_id)
    return jsonify(student_insights(student, request.args.get("term"), request.args.get("exam")))


@insights_bp.get("/compare")
@roles_required("admin", "exams")
def compare():
    ids = [int(item) for item in request.args.get("classroom_ids", "").split(",") if item.strip().isdigit()]
    if len(ids) < 2:
        return jsonify(error="Pick at least two classes to compare"), 400
    classrooms = [db.get_or_404(Classroom, classroom_id) for classroom_id in ids[:4]]
    return jsonify(compare_classes(classrooms, request.args.get("term"), request.args.get("exam")))
