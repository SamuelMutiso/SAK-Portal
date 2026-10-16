import secrets
import string
from datetime import date

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import Attendance, Classroom, Student, User
from app.schemas import AdmissionSchema, HistorySchema, LeaveSchema, StudentSchema
from app.schemas.student import HEALTH_FIELDS
from app.services.school_year import leave_school, next_admission_number, readmit, record, this_year
from app.services.sms import send_sms
from app.utils.roles import can_view_student, current_user, roles_required, search_students, students_for

students_bp = Blueprint("students", __name__, url_prefix="/api/students")
schema = StudentSchema()
PARENT_DOMAIN = "parents.successacademy.ac.ke"


def phone_key(phone):
    digits = "".join(character for character in str(phone or "") if character.isdigit())
    return digits[-9:]


def temporary_password():
    alphabet = string.ascii_uppercase.replace("O", "").replace("I", "") + "23456789"
    return "SA-" + "".join(secrets.choice(alphabet) for _ in range(6))


def find_parent(guardian):
    if guardian.get("email"):
        user = User.query.filter(db.func.lower(User.email) == guardian["email"].lower()).first()
        if user:
            return user
    key = phone_key(guardian["phone"])
    for user in User.query.filter_by(role="parent").all():
        if phone_key(user.phone) == key:
            return user
    return None


def can_see_health(user, student):
    if user.role == "admin":
        return True
    if user.role == "teacher":
        return student.classroom is not None and student.classroom.teacher_id == user.id
    return user.role == "parent" and student.parent_id == user.id


@students_bp.get("")
@jwt_required()
def list_students():
    user = current_user()
    status = request.args.get("status", "active")
    query = students_for(user, include_former=status != "active")
    if status == "former":
        query = query.filter(Student.status != "active")
    classroom_id = request.args.get("classroom_id", type=int)
    if classroom_id:
        query = query.filter(Student.classroom_id == classroom_id)
    query = search_students(query, request.args.get("search", ""))
    students = query.order_by(Student.first_name).all()
    return jsonify(schema.dump(students, many=True))


@students_bp.get("/next-admission-number")
@roles_required("admin")
def admission_number_preview():
    return jsonify(admission_number=next_admission_number())


@students_bp.get("/<int:student_id>")
@jwt_required()
def get_student(student_id):
    student = db.get_or_404(Student, student_id)
    if not can_view_student(current_user(), student):
        return jsonify(error="You do not have access to this student"), 403
    return jsonify(schema.dump(student))


@students_bp.get("/<int:student_id>/profile")
@jwt_required()
def profile(student_id):
    user = current_user()
    student = db.get_or_404(Student, student_id)
    if not can_view_student(user, student):
        return jsonify(error="You do not have access to this student"), 403
    records = Attendance.query.filter_by(student_id=student.id).all()
    present = sum(1 for item in records if item.status != "absent")
    health = {field: getattr(student, field) for field in HEALTH_FIELDS} if can_see_health(user, student) else None
    return jsonify(
        student=schema.dump(student),
        parent={"full_name": student.parent.full_name, "phone": student.parent.phone, "email": student.parent.email} if student.parent else None,
        siblings=[{"id": sibling.id, "full_name": sibling.full_name, "classroom_name": sibling.classroom.name if sibling.classroom else sibling.last_classroom_name}
                  for sibling in (student.parent.children if student.parent else []) if sibling.id != student.id],
        health=health,
        attendance={"present": present, "absent": len(records) - present, "total": len(records)},
        history=HistorySchema(many=True).dump(student.history),
    )


@students_bp.post("/admit")
@roles_required("admin")
def admit():
    user = current_user()
    data = AdmissionSchema().load(request.get_json() or {})
    classroom = db.get_or_404(Classroom, data["classroom_id"])
    guardian = data.pop("guardian")
    second = data.pop("guardian2") or {}

    parent = find_parent(guardian)
    password = None
    if not parent:
        password = temporary_password()
        email = guardian.get("email") or f"{phone_key(guardian['phone'])}@{PARENT_DOMAIN}"
        parent = User(full_name=guardian["full_name"], email=email.lower(), phone=guardian["phone"], role="parent")
        parent.set_password(password)
        db.session.add(parent)

    if data.get("is_boarder"):
        data["transport_route_id"] = None
    student = Student(
        **data,
        admission_number=next_admission_number(),
        parent=parent,
        guardian_relationship=guardian.get("relationship"),
        guardian2_name=second.get("full_name"),
        guardian2_phone=second.get("phone"),
        guardian2_relationship=second.get("relationship"),
    )
    student.admission_date = student.admission_date or date.today()
    db.session.add(student)
    db.session.flush()
    record(student, this_year(), "admitted", classroom.name, f"Admitted into {classroom.name}", user)

    if password:
        message = (f"Welcome to Success Academy. {student.first_name} has been admitted to {classroom.name}, admission number {student.admission_number}. "
                   f"Sign in to the parent portal with {parent.email} and password {password}. You will be asked to change it.")
    else:
        message = f"Success Academy: {student.first_name} has been admitted to {classroom.name}, admission number {student.admission_number}. You can see them in your parent portal."
    sms = send_sms([parent.phone], message)
    db.session.commit()
    return jsonify(
        student=schema.dump(student),
        parent={"full_name": parent.full_name, "email": parent.email, "phone": parent.phone, "is_new": password is not None,
                "children": len(parent.children)},
        temporary_password=password,
        sms={"message": message, **sms},
    ), 201


@students_bp.post("")
@roles_required("admin")
def create_student():
    payload = request.get_json() or {}
    if not payload.get("admission_number"):
        payload["admission_number"] = next_admission_number()
    data = schema.load(payload)
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


@students_bp.post("/<int:student_id>/leave")
@roles_required("admin")
def leave(student_id):
    student = db.get_or_404(Student, student_id)
    if student.status != "active":
        return jsonify(error="This learner has already left the school"), 400
    data = LeaveSchema().load(request.get_json() or {})
    leave_school(student, data["status"], data["reason"], current_user(), data.get("left_on"))
    db.session.commit()
    return jsonify(schema.dump(student))


@students_bp.post("/<int:student_id>/readmit")
@roles_required("admin")
def readmit_student(student_id):
    student = db.get_or_404(Student, student_id)
    if student.status == "active":
        return jsonify(error="This learner is already in school"), 400
    classroom = db.get_or_404(Classroom, (request.get_json() or {}).get("classroom_id"))
    readmit(student, classroom, current_user())
    db.session.commit()
    return jsonify(schema.dump(student))


@students_bp.delete("/<int:student_id>")
@roles_required("admin")
def delete_student(student_id):
    student = db.get_or_404(Student, student_id)
    if student.status == "active":
        leave_school(student, "withdrawn", "Removed by the school office", current_user())
        db.session.commit()
    return "", 204
