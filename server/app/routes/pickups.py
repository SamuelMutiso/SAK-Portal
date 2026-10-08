from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import AuthorizedPickup, Student
from app.schemas import PickupSchema, StudentSchema
from app.utils.roles import current_user, roles_required, search_students, students_for, viewable_student

pickups_bp = Blueprint("pickups", __name__, url_prefix="/api/pickups")
schema = PickupSchema()


@pickups_bp.get("/student/<int:student_id>")
@jwt_required()
def list_pickups(student_id):
    student = viewable_student(student_id)
    return jsonify(
        pickups=schema.dump(student.pickups, many=True),
        emergency_contact={"name": student.emergency_contact_name, "phone": student.emergency_contact_phone},
    )


@pickups_bp.post("/student/<int:student_id>")
@roles_required("admin", "parent")
def add_pickup(student_id):
    student = viewable_student(student_id)
    data = schema.load(request.get_json() or {})
    if len(student.pickups) >= 5:
        return jsonify(error="You can list up to 5 people"), 400
    pickup = AuthorizedPickup(student_id=student.id, **data)
    db.session.add(pickup)
    db.session.commit()
    return jsonify(schema.dump(pickup)), 201


@pickups_bp.put("/student/<int:student_id>/emergency")
@roles_required("admin", "parent")
def set_emergency_contact(student_id):
    student = viewable_student(student_id)
    data = request.get_json() or {}
    student.emergency_contact_name = data.get("name")
    student.emergency_contact_phone = data.get("phone")
    db.session.commit()
    return jsonify(name=student.emergency_contact_name, phone=student.emergency_contact_phone)


@pickups_bp.delete("/<int:pickup_id>")
@roles_required("admin", "parent")
def remove_pickup(pickup_id):
    pickup = db.get_or_404(AuthorizedPickup, pickup_id)
    viewable_student(pickup.student_id)
    db.session.delete(pickup)
    db.session.commit()
    return "", 204


@pickups_bp.get("/check")
@roles_required("admin", "teacher")
def gate_check():
    search = request.args.get("search", "").strip()
    query = students_for(current_user())
    query = search_students(query, search)
    students = query.order_by(Student.first_name).limit(20).all()
    return jsonify([
        {
            **StudentSchema().dump(student),
            "pickups": schema.dump(student.pickups, many=True),
            "emergency_contact": {"name": student.emergency_contact_name, "phone": student.emergency_contact_phone},
        }
        for student in students
    ])
