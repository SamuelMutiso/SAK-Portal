import csv
import io

from flask import Blueprint, Response, jsonify, request

from app.curriculum import current_term, SBA_CLASSES, learning_areas_for
from app.extensions import db
from app.models import Assessment, Classroom
from app.utils.roles import roles_required

sba_bp = Blueprint("sba", __name__, url_prefix="/api/sba")


def scores_by_student(classroom, term):
    student_ids = [student.id for student in classroom.students]
    records = Assessment.query.filter(
        Assessment.student_id.in_(student_ids),
        Assessment.term == term,
        Assessment.score.isnot(None),
    ).all()
    table = {}
    for record in records:
        table.setdefault(record.student_id, {}).setdefault(record.subject, []).append(record.score)
    return table


@sba_bp.get("")
@roles_required("admin")
def tracker():
    term = request.args.get("term") or current_term()
    classes = Classroom.query.filter(Classroom.name.in_(SBA_CLASSES)).order_by(Classroom.id).all()
    result = []
    for classroom in classes:
        table = scores_by_student(classroom, term)
        areas = []
        for area in learning_areas_for(classroom.level):
            missing = [student.full_name for student in classroom.students if area not in table.get(student.id, {})]
            areas.append({"name": area, "done": len(classroom.students) - len(missing), "missing": missing})
        missing_numbers = [student.full_name for student in classroom.students if not student.assessment_number]
        result.append({
            "classroom_id": classroom.id,
            "name": classroom.name,
            "students": len(classroom.students),
            "areas": areas,
            "missing_assessment_numbers": missing_numbers,
        })
    return jsonify(term=term, classes=result)


@sba_bp.get("/export/<int:classroom_id>")
@roles_required("admin")
def export(classroom_id):
    term = request.args.get("term") or current_term()
    classroom = db.get_or_404(Classroom, classroom_id)
    areas = learning_areas_for(classroom.level)
    table = scores_by_student(classroom, term)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Assessment Number", "UPI", "Admission Number", "Name", *areas])
    for student in sorted(classroom.students, key=lambda item: item.full_name):
        scores = table.get(student.id, {})
        row = [student.assessment_number or "", student.upi or "", student.admission_number, student.full_name]
        for area in areas:
            values = scores.get(area)
            row.append(round(sum(values) / len(values)) if values else "")
        writer.writerow(row)

    filename = f"SBA_{classroom.name.replace(' ', '_')}_{term.replace(' ', '_')}.csv"
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
