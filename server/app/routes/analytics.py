from flask import Blueprint, jsonify

from app.curriculum import LEVEL_POINTS, TERMS, current_term, term_label, term_year, terms_of_year, uses_marks
from app.models import Assessment, Attendance, Classroom, Club, Notice, Student
from app.models.assessment import EXAMS
from app.utils.roles import roles_required

analytics_bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")

ORDER = {(term, exam): index for index, (term, exam) in enumerate((term, exam) for term in TERMS for exam in EXAMS)}


def value(record):
    return record.score if record.score is not None else LEVEL_POINTS.get(record.level)


def student_summary(student, records):
    by_step = {}
    for record in records:
        result = value(record)
        if result is not None:
            by_step.setdefault((record.term, record.exam), []).append(result)
    if not by_step:
        return None
    steps = sorted(by_step, key=lambda step: ORDER.get(step, 0))
    first = sum(by_step[steps[0]]) / len(by_step[steps[0]])
    latest = sum(by_step[steps[-1]]) / len(by_step[steps[-1]])
    return {
        "id": student.id,
        "full_name": student.full_name,
        "admission_number": student.admission_number,
        "latest": round(latest, 1),
        "first": round(first, 1),
        "change": round(latest - first, 1),
        "latest_label": term_label(*steps[-1]),
        "first_label": term_label(*steps[0]),
    }


@analytics_bp.get("/performance")
@roles_required("admin", "exams")
def performance():
    records_by_student = {}
    for record in Assessment.query.filter(Assessment.term.in_(terms_of_year(term_year(current_term())))).all():
        records_by_student.setdefault(record.student_id, []).append(record)

    classes = []
    everyone = []
    for classroom in Classroom.query.order_by(Classroom.id).all():
        marked = uses_marks(classroom.level)
        summaries = [summary for summary in (student_summary(student, records_by_student.get(student.id, [])) for student in classroom.students) if summary]
        if not summaries:
            continue
        ranked = sorted(summaries, key=lambda item: item["latest"], reverse=True)
        improved = [item for item in sorted(summaries, key=lambda item: item["change"], reverse=True) if item["change"] > 0]
        for item in summaries:
            item["classroom_name"] = classroom.name
        if marked:
            everyone += summaries
        classes.append({
            "classroom_id": classroom.id,
            "name": classroom.name,
            "level": classroom.level,
            "teacher_name": classroom.teacher.full_name if classroom.teacher else None,
            "scale": "marks" if marked else "levels",
            "learners": len(classroom.students),
            "mean": round(sum(item["latest"] for item in summaries) / len(summaries), 1),
            "top": ranked[:3],
            "most_improved": improved[:3],
            "needs_support": ranked[-3:][::-1] if len(ranked) > 3 else [],
        })

    marked_classes = [item for item in classes if item["scale"] == "marks"]
    return jsonify(
        term=current_term(),
        classes=classes,
        school_top=sorted(everyone, key=lambda item: item["latest"], reverse=True)[:5],
        school_improved=sorted(everyone, key=lambda item: item["change"], reverse=True)[:5],
        class_ranking=sorted(({"name": item["name"], "mean": item["mean"]} for item in marked_classes), key=lambda item: item["mean"], reverse=True),
    )


@analytics_bp.get("/summary")
@roles_required("admin")
def summary():
    attendance = Attendance.query.all()
    present = sum(1 for record in attendance if record.status != "absent")
    return jsonify(
        learners=Student.query.count(),
        boarders=Student.query.filter_by(is_boarder=True).count(),
        clubs=Club.query.count(),
        club_members=sum(len(club.students) for club in Club.query.all()),
        notices=Notice.query.count(),
        attendance_rate=round(present / len(attendance) * 100) if attendance else 0,
        fees_outstanding=sum(student.fee_balance or 0 for student in Student.query.all()),
    )
