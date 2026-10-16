import re
from datetime import date

from app.curriculum import current_term, term_year
from app.extensions import db
from app.models import Classroom, PromotionRun, Student, StudentHistory


def this_year():
    return term_year(current_term())


def next_admission_number(year=None):
    year = year or this_year()
    prefix = f"SAK-{year}-"
    numbers = [
        int(match.group(1))
        for (value,) in db.session.query(Student.admission_number).filter(Student.admission_number.like(f"{prefix}%")).all()
        if (match := re.fullmatch(rf"{re.escape(prefix)}(\d+)", value))
    ]
    return f"{prefix}{(max(numbers) if numbers else 0) + 1:04d}"


def ladder():
    return Classroom.query.order_by(Classroom.sort_order, Classroom.id).all()


def next_class(classroom):
    classes = ladder()
    position = [item.id for item in classes].index(classroom.id)
    return classes[position + 1] if position + 1 < len(classes) else None


def active_students(classroom):
    return [student for student in classroom.students if student.status == "active"]


def members(classroom, year):
    if year == this_year() and not PromotionRun.query.filter_by(from_year=year).first():
        return active_students(classroom)
    rows = StudentHistory.query.filter_by(year=year, classroom_name=classroom.name).all()
    seen = {}
    for row in rows:
        seen.setdefault(row.student_id, row.student)
    return list(seen.values())


def record(student, year, outcome, classroom_name=None, note=None, user=None):
    entry = StudentHistory(
        year=year, outcome=outcome, note=note,
        classroom_name=classroom_name if classroom_name is not None else (student.classroom.name if student.classroom else student.last_classroom_name),
        recorded_by_id=user.id if user else None,
    )
    student.history.append(entry)
    return entry


def promotion_preview(from_year):
    done = PromotionRun.query.filter_by(from_year=from_year).first()
    rows = []
    for classroom in ladder():
        target = next_class(classroom)
        learners = sorted(active_students(classroom), key=lambda student: student.first_name)
        rows.append({
            "classroom_id": classroom.id,
            "name": classroom.name,
            "next": target.name if target else None,
            "completes": target is None,
            "learners": [{"id": student.id, "full_name": student.full_name, "admission_number": student.admission_number} for student in learners],
        })
    return {"from_year": from_year, "to_year": from_year + 1, "already_run": done is not None, "rows": rows}


def run_promotion(user, from_year, hold_back=()):
    if PromotionRun.query.filter_by(from_year=from_year).first():
        raise ValueError(f"Learners have already been promoted from {from_year}.")
    hold_back = set(hold_back)
    moves = []
    for classroom in ladder():
        target = next_class(classroom)
        for student in active_students(classroom):
            moves.append((student, classroom, target))

    counts = {"promoted": 0, "repeated": 0, "completed": 0}
    for student, classroom, target in moves:
        if student.id in hold_back:
            record(student, from_year, "repeated", classroom.name, f"Repeats {classroom.name} in {from_year + 1}", user)
            counts["repeated"] += 1
        elif target is None:
            record(student, from_year, "completed", classroom.name, f"Completed {classroom.name}", user)
            student.status = "completed"
            student.left_on = date.today()
            student.last_classroom_name = classroom.name
            student.classroom_id = None
            counts["completed"] += 1
        else:
            record(student, from_year, "promoted", classroom.name, f"Promoted to {target.name}", user)
            student.classroom_id = target.id
            counts["promoted"] += 1
    run = PromotionRun(from_year=from_year, to_year=from_year + 1, run_by_id=user.id, **counts)
    db.session.add(run)
    return run


def leave_school(student, status, reason, user, left_on=None):
    record(student, this_year(), status, note=reason, user=user)
    student.status = status
    student.leaving_reason = reason
    student.left_on = left_on or date.today()
    student.last_classroom_name = student.classroom.name if student.classroom else student.last_classroom_name
    student.classroom_id = None


def readmit(student, classroom, user):
    student.status = "active"
    student.classroom_id = classroom.id
    student.left_on = None
    student.leaving_reason = None
    record(student, this_year(), "readmitted", classroom.name, f"Readmitted into {classroom.name}", user)
