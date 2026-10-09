from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.curriculum import LEVEL_POINTS, current_term, learning_areas_for, term_label, term_year, terms_of_year, uses_marks
from app.extensions import db
from app.models import Assessment, Attendance, Classroom, TermReport
from app.models.assessment import EXAMS
from app.schemas import AssessmentSchema, StudentSchema, TermReportSchema
from app.utils.roles import current_user, roles_required, students_for, viewable_student

reports_bp = Blueprint("reports", __name__, url_prefix="/api/reports")
schema = TermReportSchema()

TEACHER_FIELDS = ("competencies", "values", "co_curricular", "teacher_comment")
ADMIN_FIELDS = TEACHER_FIELDS + ("head_comment", "closing_date", "opening_date")


def report_for(student, term):
    return TermReport.query.filter_by(student_id=student.id, term=term).first()


@reports_bp.get("/student/<int:student_id>")
@jwt_required()
def full_report(student_id):
    student = viewable_student(student_id)
    term = request.args.get("term") or current_term()
    assessments = Assessment.query.filter_by(student_id=student.id, term=term).all()
    attendance = Attendance.query.filter_by(student_id=student.id).all()
    present = sum(1 for record in attendance if record.status != "absent")
    report = report_for(student, term)
    return jsonify(
        term=term,
        student=StudentSchema().dump(student),
        learning_areas=learning_areas_for(student.classroom.level) if student.classroom else [],
        uses_marks=uses_marks(student.classroom.level) if student.classroom else False,
        class_teacher=student.classroom.teacher.full_name if student.classroom and student.classroom.teacher else None,
        assessments=AssessmentSchema(many=True).dump(assessments),
        attendance={"present": present, "total": len(attendance)},
        report=schema.dump(report) if report else None,
    )


@reports_bp.put("/student/<int:student_id>")
@roles_required("admin", "teacher")
def save_report(student_id):
    user = current_user()
    student = viewable_student(student_id)
    term = request.args.get("term") or current_term()
    data = schema.load(request.get_json() or {}, partial=True)
    allowed = ADMIN_FIELDS if user.role == "admin" else TEACHER_FIELDS

    report = report_for(student, term)
    if not report:
        report = TermReport(student_id=student.id, term=term, competencies={}, values={})
        db.session.add(report)
    for field in allowed:
        if field in data:
            setattr(report, field, data[field])
    db.session.commit()
    return jsonify(schema.dump(report))


@reports_bp.get("/class")
@roles_required("admin", "teacher")
def class_progress():
    term = request.args.get("term") or current_term()
    students = students_for(current_user()).all()
    reports = {report.student_id: report for report in TermReport.query.filter_by(term=term).all()}
    rows = []
    for student in students:
        report = reports.get(student.id)
        rows.append({
            "student_id": student.id,
            "full_name": student.full_name,
            "classroom_name": student.classroom.name if student.classroom else None,
            "has_teacher_comment": bool(report and report.teacher_comment),
            "competencies_done": len(report.competencies or {}) if report else 0,
            "has_head_comment": bool(report and report.head_comment),
        })
    return jsonify(rows)


def record_value(record):
    if record.score is not None:
        return record.score
    return LEVEL_POINTS.get(record.level)


def selected_year():
    return request.args.get("year", type=int) or term_year(current_term())


def series(records, year):
    points = []
    for term in terms_of_year(year):
        for exam in EXAMS:
            values = [record_value(record) for record in records if record.term == term and record.exam == exam]
            values = [value for value in values if value is not None]
            if values:
                points.append({"term": term, "exam": exam, "label": term_label(term, exam), "value": round(sum(values) / len(values), 1)})
    return points


@reports_bp.get("/student/<int:student_id>/trend")
@jwt_required()
def student_trend(student_id):
    student = viewable_student(student_id)
    year = selected_year()
    records = Assessment.query.filter(Assessment.student_id == student.id, Assessment.term.in_(terms_of_year(year))).all()
    areas = learning_areas_for(student.classroom.level) if student.classroom else []
    subjects = []
    for area in areas:
        points = series([record for record in records if record.subject == area], year)
        change = round(points[-1]["value"] - points[-2]["value"], 1) if len(points) > 1 else None
        subjects.append({"name": area, "points": points, "change": change, "latest": points[-1]["value"] if points else None})
    return jsonify(
        scale="marks" if uses_marks(student.classroom.level) else "levels",
        overall=series(records, year),
        subjects=subjects,
        year=year,
    )


@reports_bp.get("/class-trend")
@roles_required("admin", "teacher")
def class_trend():
    user = current_user()
    query = Classroom.query
    classroom_id = request.args.get("classroom_id", type=int)
    classroom = db.get_or_404(Classroom, classroom_id) if classroom_id else query.filter_by(teacher_id=user.id).first_or_404()
    if user.role == "teacher" and classroom.teacher_id != user.id:
        return jsonify(error="You can only view your own class"), 403
    student_ids = [student.id for student in classroom.students]
    year = selected_year()
    records = Assessment.query.filter(Assessment.student_id.in_(student_ids), Assessment.term.in_(terms_of_year(year))).all()
    return jsonify(classroom=classroom.name, scale="marks" if uses_marks(classroom.level) else "levels", overall=series(records, year), year=year)
