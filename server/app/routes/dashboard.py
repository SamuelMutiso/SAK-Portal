from datetime import date, timedelta

from flask import Blueprint, jsonify
from sqlalchemy import func

from app.extensions import db
from app.models import Attendance, Classroom, Club, Notice, Student, User
from app.utils.roles import roles_required

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


@dashboard_bp.get("")
@roles_required("admin")
def summary():
    today = date.today()
    present_today = Attendance.query.filter_by(date=today).filter(Attendance.status != "absent").count()
    marked_today = Attendance.query.filter_by(date=today).count()

    by_class = (
        db.session.query(Classroom.name, func.count(Student.id))
        .outerjoin(Student)
        .group_by(Classroom.id, Classroom.name)
        .order_by(Classroom.id)
        .all()
    )

    week = []
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        records = Attendance.query.filter_by(date=day)
        total = records.count()
        present = records.filter(Attendance.status != "absent").count()
        rate = round(present / total * 100) if total else 0
        week.append({"date": day.isoformat(), "rate": rate})

    return jsonify(
        students=Student.query.count(),
        teachers=User.query.filter_by(role="teacher").count(),
        parents=User.query.filter_by(role="parent").count(),
        clubs=Club.query.count(),
        boarders=Student.query.filter_by(is_boarder=True).count(),
        sms_sent=db.session.query(func.coalesce(func.sum(Notice.sms_count), 0)).scalar(),
        attendance_today={"present": present_today, "marked": marked_today},
        students_by_class=[{"name": name, "count": count} for name, count in by_class],
        attendance_week=week,
    )
