from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.curriculum import CURRENT_TERM, learning_areas_for, uses_marks
from app.extensions import db
from app.models import Assessment, Attendance, TermReport
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
    term = request.args.get("term", CURRENT_TERM)
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
    term = request.args.get("term", CURRENT_TERM)
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
    term = request.args.get("term", CURRENT_TERM)
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
