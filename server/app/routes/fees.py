from flask import Blueprint, current_app, jsonify, request

from app.models import Student
from app.schemas import StudentSchema
from app.services.sms import send_sms
from app.utils.roles import roles_required

fees_bp = Blueprint("fees", __name__, url_prefix="/api/fees")


def fee_message(student):
    paybill = current_app.config["SCHOOL_PAYBILL"]
    how_to_pay = f"Paybill {paybill}" if paybill else "the school M-Pesa Paybill"
    return (
        f"Success Academy: Dear parent, {student.first_name}'s fee balance is KES {student.fee_balance:,}. "
        f"Pay via {how_to_pay}, account {student.admission_number}. Thank you."
    )


@fees_bp.get("")
@roles_required("admin")
def list_balances():
    students = Student.query.filter(Student.fee_balance > 0).order_by(Student.fee_balance.desc()).all()
    return jsonify(
        total=sum(student.fee_balance for student in students),
        students=StudentSchema(many=True).dump(students),
    )


@fees_bp.post("/remind")
@roles_required("admin")
def send_fee_reminders():
    student_ids = (request.get_json() or {}).get("student_ids")
    query = Student.query.filter(Student.fee_balance > 0)
    if student_ids:
        query = query.filter(Student.id.in_(student_ids))

    sent = 0
    recipients = []
    sample = None
    mode = "none"
    for student in query.all():
        if not student.parent or not student.parent.is_active:
            continue
        message = fee_message(student)
        result = send_sms([student.parent.phone], message)
        sent += result["sent"]
        recipients += result["recipients"]
        mode = result["mode"]
        sample = sample or message

    return jsonify(sms={"sent": sent, "mode": mode, "recipients": recipients, "message": sample})
