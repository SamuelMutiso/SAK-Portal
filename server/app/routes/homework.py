from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import Homework
from app.routes.acknowledgements import seen_counts
from app.schemas import HomeworkSchema
from app.utils.roles import current_user, roles_required

homework_bp = Blueprint("homework", __name__, url_prefix="/api/homework")
schema = HomeworkSchema()


@homework_bp.get("")
@jwt_required()
def list_homework():
    user = current_user()
    query = Homework.query
    if user.role == "teacher":
        query = query.filter(Homework.teacher_id == user.id)
    elif user.role == "parent":
        class_ids = {child.classroom_id for child in user.children}
        query = query.filter(Homework.classroom_id.in_(class_ids))
    homework = query.order_by(Homework.due_date.desc()).all()
    data = schema.dump(homework, many=True)
    if user.role != "parent":
        counts = seen_counts("homework", [item.id for item in homework])
        for item, record in zip(data, homework):
            item["seen_count"] = counts.get(record.id, 0)
            item["parent_count"] = len({student.parent_id for student in record.classroom.students if student.parent_id})
    return jsonify(data)


@homework_bp.post("")
@roles_required("admin", "teacher")
def create_homework():
    user = current_user()
    data = schema.load(request.get_json() or {})
    if user.role == "teacher" and (not user.classroom or user.classroom.id != data["classroom_id"]):
        return jsonify(error="Teachers can only set homework for their own class"), 403
    homework = Homework(**data, teacher_id=user.id)
    db.session.add(homework)
    db.session.commit()
    return jsonify(schema.dump(homework)), 201


@homework_bp.delete("/<int:homework_id>")
@roles_required("admin", "teacher")
def delete_homework(homework_id):
    user = current_user()
    homework = db.get_or_404(Homework, homework_id)
    if user.role == "teacher" and homework.teacher_id != user.id:
        return jsonify(error="You can only delete your own homework"), 403
    db.session.delete(homework)
    db.session.commit()
    return "", 204
