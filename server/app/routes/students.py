from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import Student
from app.schemas import StudentSchema
from app.utils.roles import can_view_student, current_user, roles_required, students_for

students_bp = Blueprint("students", __name__, url_prefix="/api/students")
schema = StudentSchema()


@students_bp.get("")
@jwt_required()
def list_students():
    query = students_for(current_user())
    classroom_id = request.args.get("classroom_id", type=int)
    if classroom_id:
        query = query.filter(Student.classroom_id == classroom_id)
    search = request.args.get("search")
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            Student.first_name.ilike(pattern)
            | Student.last_name.ilike(pattern)
            | Student.admission_number.ilike(pattern)
        )
    students = query.order_by(Student.first_name).all()
    return jsonify(schema.dump(students, many=True))


@students_bp.get("/<int:student_id>")
@jwt_required()
def get_student(student_id):
    student = db.get_or_404(Student, student_id)
    if not can_view_student(current_user(), student):
        return jsonify(error="You do not have access to this student"), 403
    return jsonify(schema.dump(student))


@students_bp.post("")
@roles_required("admin")
def create_student():
    data = schema.load(request.get_json() or {})
    student = Student(**data)
    db.session.add(student)
    db.session.commit()
    return jsonify(schema.dump(student)), 201


@students_bp.patch("/<int:student_id>")
@roles_required("admin")
def update_student(student_id):
    student = db.get_or_404(Student, student_id)
    data = schema.load(request.get_json() or {}, partial=True)
    for field, value in data.items():
        setattr(student, field, value)
    db.session.commit()
    return jsonify(schema.dump(student))


@students_bp.delete("/<int:student_id>")
@roles_required("admin")
def delete_student(student_id):
    student = db.get_or_404(Student, student_id)
    db.session.delete(student)
    db.session.commit()
    return "", 204
