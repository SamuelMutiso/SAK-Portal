from flask import Blueprint, jsonify, request

from app.extensions import db
from app.models import Classroom
from app.schemas import ClassroomSchema
from app.utils.roles import current_user, roles_required

classes_bp = Blueprint("classes", __name__, url_prefix="/api/classes")
schema = ClassroomSchema()


@classes_bp.get("")
@roles_required("admin", "teacher")
def list_classes():
    user = current_user()
    query = Classroom.query.order_by(Classroom.id)
    if user.role == "teacher":
        query = query.filter_by(teacher_id=user.id)
    return jsonify(schema.dump(query.all(), many=True))


@classes_bp.post("")
@roles_required("admin")
def create_class():
    data = schema.load(request.get_json() or {})
    classroom = Classroom(**data)
    db.session.add(classroom)
    db.session.commit()
    return jsonify(schema.dump(classroom)), 201


@classes_bp.patch("/<int:class_id>")
@roles_required("admin")
def update_class(class_id):
    classroom = db.get_or_404(Classroom, class_id)
    data = schema.load(request.get_json() or {}, partial=True)
    for field, value in data.items():
        setattr(classroom, field, value)
    db.session.commit()
    return jsonify(schema.dump(classroom))
