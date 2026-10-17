from datetime import date, timedelta

from flask import Blueprint, jsonify

from app.curriculum import current_term
from app.models import Acknowledgement, Homework, LearningMaterial, Notice, SchoolTerm
from app.routes.notices import notices_for_parent
from app.services.insights import student_insights
from app.utils.roles import current_user, roles_required, viewable_student

catch_up_bp = Blueprint("catch_up", __name__, url_prefix="/api/catch-up")


@catch_up_bp.get("/<int:student_id>")
@roles_required("parent")
def catch_up(student_id):
    user = current_user()
    student = viewable_student(student_id)
    today = date.today()
    seen = {(record.item_type, record.item_id) for record in Acknowledgement.query.filter_by(user_id=user.id).all()}

    notices = [notice for notice in notices_for_parent(user).order_by(Notice.created_at.desc()).limit(30).all() if ("notice", notice.id) not in seen]

    term = SchoolTerm.query.filter_by(name=current_term()).first()
    start = term.start_date if term and term.start_date else today - timedelta(days=90)
    records = [record for record in student.attendance if start <= record.date <= today]
    absent = sum(1 for record in records if record.status == "absent")
    late = sum(1 for record in records if record.status == "late")

    homework = Homework.query.filter(Homework.classroom_id == student.classroom_id, Homework.due_date >= today).all() if student.classroom_id else []
    homework = [item for item in homework if ("homework", item.id) not in seen]

    week_ago = today - timedelta(days=7)
    materials = LearningMaterial.query.filter(LearningMaterial.classroom_id == student.classroom_id, LearningMaterial.created_at >= week_ago).count() if student.classroom_id else 0

    insight = student_insights(student)
    results = None if insight.get("empty") else {
        "label": insight["label"],
        "mean": insight["mean"],
        "grade": insight["grade"],
        "change": insight["change"],
        "scale": insight["scale"],
        "previous_label": insight["previous_label"],
        "needs_improvement": [item["subject"] for item in insight["needs_improvement"]][:3],
    }

    return jsonify(
        student_id=student.id,
        first_name=student.first_name,
        unread_notices={"count": len(notices), "titles": [notice.title for notice in notices[:3]]},
        attendance={"days": len(records), "absent": absent, "late": late,
                    "rate": round((len(records) - absent) / len(records) * 100) if records else None},
        homework_due={"count": len(homework), "titles": [item.title for item in sorted(homework, key=lambda item: item.due_date)[:3]]},
        new_materials=materials,
        results=results,
        fee_balance=student.fee_balance or 0,
    )

