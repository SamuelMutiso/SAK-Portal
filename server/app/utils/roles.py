from functools import wraps

from flask import abort, jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request

from app.extensions import db
from app.models import User


def roles_required(*roles):
    def decorator(view):
        @wraps(view)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            if get_jwt().get("role") not in roles:
                return jsonify(error="You do not have access to this"), 403
            return view(*args, **kwargs)

        return wrapper

    return decorator


def current_user():
    return db.session.get(User, int(get_jwt_identity()))


def students_for(user):
    from app.models import Classroom, Student

    query = Student.query
    if user.role == "teacher":
        query = query.join(Classroom).filter(Classroom.teacher_id == user.id)
    elif user.role == "parent":
        query = query.filter(Student.parent_id == user.id)
    return query


def can_view_student(user, student):
    if user.role == "admin":
        return True
    if user.role == "teacher":
        return student.classroom is not None and student.classroom.teacher_id == user.id
    return student.parent_id == user.id


def viewable_student(student_id):
    from app.models import Student

    student = db.get_or_404(Student, student_id)
    if not can_view_student(current_user(), student):
        abort(403)
    return student


def search_students(query, text):
    from app.models import Student

    for word in text.split():
        pattern = f"%{word}%"
        query = query.filter(
            Student.first_name.ilike(pattern) | Student.last_name.ilike(pattern) | Student.admission_number.ilike(pattern)
        )
    return query
