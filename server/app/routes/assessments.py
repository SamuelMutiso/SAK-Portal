from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import Assessment, MarkChange, Student
from app.models.assessment import level_for
from app.schemas import AssessmentSchema, GradeSheetSchema, LearnerSheetSchema, MarkChangeSchema
from app.utils.roles import can_view_student, current_user, roles_required, students_for

assessments_bp = Blueprint("assessments", __name__, url_prefix="/api/assessments")
schema = AssessmentSchema()

MIN_REASON = 5


def find_record(student_id, subject, term, exam):
    return Assessment.query.filter_by(student_id=student_id, subject=subject, term=term, exam=exam).first()


def new_level(score, level):
    return level_for(score) if score is not None else level


def is_change(record, score, level):
    if not record:
        return False
    return record.score != score or record.level != new_level(score, level)


def reason_ok(reason):
    return len((reason or "").strip()) >= MIN_REASON


def save_assessment(user, student_id, subject, term, exam, score=None, level=None, comment=None, reason=None):
    record = find_record(student_id, subject, term, exam)
    if is_change(record, score, level):
        record.changes.append(MarkChange(
            old_score=record.score, old_level=record.level,
            new_score=score, new_level=new_level(score, level),
            reason=reason.strip(), changed_by_id=user.id,
        ))
    if not record:
        record = Assessment(student_id=student_id, subject=subject, term=term, exam=exam)
        db.session.add(record)
    record.score = score
    record.level = new_level(score, level)
    if comment is not None:
        record.comment = comment
    record.teacher_id = user.id
    return record


@assessments_bp.get("")
@roles_required("admin", "teacher", "exams")
def list_assessments():
    students = students_for(current_user())
    classroom_id = request.args.get("classroom_id", type=int)
    if classroom_id:
        students = students.filter(Student.classroom_id == classroom_id)
    student_ids = [student.id for student in students.all()]
    query = Assessment.query.filter(Assessment.student_id.in_(student_ids))
    for field in ("subject", "term", "exam"):
        value = request.args.get(field)
        if value:
            query = query.filter(getattr(Assessment, field) == value)
    return jsonify(schema.dump(query.all(), many=True))


@assessments_bp.get("/student/<int:student_id>")
@jwt_required()
def student_assessments(student_id):
    student = db.get_or_404(Student, student_id)
    if not can_view_student(current_user(), student):
        return jsonify(error="You do not have access to this student"), 403
    query = Assessment.query.filter_by(student_id=student_id)
    for field in ("term", "exam"):
        value = request.args.get(field)
        if value:
            query = query.filter(getattr(Assessment, field) == value)
    records = query.order_by(Assessment.term, Assessment.subject).all()
    return jsonify(schema.dump(records, many=True))


@assessments_bp.post("/student/<int:student_id>")
@roles_required("admin", "teacher", "exams")
def save_learner_marks(student_id):
    user = current_user()
    student = db.get_or_404(Student, student_id)
    if not can_view_student(user, student):
        return jsonify(error="You can only enter marks for learners in your class"), 403
    data = LearnerSheetSchema().load(request.get_json() or {})

    missing = []
    for entry in data["scores"]:
        existing = find_record(student.id, entry["subject"], data["term"], data["exam"])
        if is_change(existing, entry.get("score"), entry.get("level")) and not reason_ok(entry.get("reason")):
            missing.append(entry["subject"])
    if missing:
        return jsonify(error=f"Give a reason for changing {', '.join(missing)}. Nothing was saved.", needs_reason=missing), 400

    saved = [
        save_assessment(
            user, student.id, entry["subject"], data["term"], data["exam"],
            score=entry.get("score"), level=entry.get("level"), reason=entry.get("reason"),
        )
        for entry in data["scores"]
    ]
    db.session.commit()
    return jsonify(schema.dump(saved, many=True)), 201


@assessments_bp.post("")
@roles_required("admin", "teacher", "exams")
def create_assessment():
    user = current_user()
    data = schema.load(request.get_json() or {})
    student = db.get_or_404(Student, data["student_id"])
    if not can_view_student(user, student):
        return jsonify(error="You can only assess students in your class"), 403
    if data.get("score") is None and not data.get("level"):
        return jsonify(error="Enter a score or a level"), 400
    existing = find_record(student.id, data["subject"], data["term"], data["exam"])
    if is_change(existing, data.get("score"), data.get("level")) and not reason_ok(data.get("reason")):
        return jsonify(error="This mark was already entered. Give a reason for changing it.", needs_reason=[student.id]), 400

    record = save_assessment(
        user, student.id, data["subject"], data["term"], data["exam"],
        score=data.get("score"), level=data.get("level"), comment=data.get("comment"), reason=data.get("reason"),
    )
    db.session.commit()
    return jsonify(schema.dump(record)), 201


@assessments_bp.post("/sheet")
@roles_required("admin", "teacher", "exams")
def save_grade_sheet():
    user = current_user()
    data = GradeSheetSchema().load(request.get_json() or {})
    allowed_ids = {student.id for student in students_for(user).all()}
    entries = [entry for entry in data["scores"] if entry["student_id"] in allowed_ids]

    missing = []
    for entry in entries:
        existing = find_record(entry["student_id"], data["subject"], data["term"], data["exam"])
        if is_change(existing, entry.get("score"), entry.get("level")) and not reason_ok(entry.get("reason")):
            missing.append(entry["student_id"])
    if missing:
        names = [db.session.get(Student, student_id).full_name for student_id in missing]
        return jsonify(error=f"Give a reason for changing the mark of {', '.join(names)}. Nothing was saved.", needs_reason=missing), 400

    saved = [
        save_assessment(
            user, entry["student_id"], data["subject"], data["term"], data["exam"],
            score=entry.get("score"), level=entry.get("level"), reason=entry.get("reason"),
        )
        for entry in entries
    ]
    db.session.commit()
    return jsonify(schema.dump(saved, many=True)), 201


@assessments_bp.get("/changes")
@roles_required("admin", "teacher", "exams", "superadmin")
def mark_changes():
    user = current_user()
    query = MarkChange.query.join(Assessment)
    if user.role == "teacher":
        query = query.filter(Assessment.student_id.in_([student.id for student in students_for(user).all()]))
    student_id = request.args.get("student_id", type=int)
    if student_id:
        query = query.filter(Assessment.student_id == student_id)
    classroom_id = request.args.get("classroom_id", type=int)
    if classroom_id:
        query = query.join(Student, Student.id == Assessment.student_id).filter(Student.classroom_id == classroom_id)
    changes = query.order_by(MarkChange.changed_at.desc()).limit(200).all()
    return jsonify(MarkChangeSchema(many=True).dump(changes))
