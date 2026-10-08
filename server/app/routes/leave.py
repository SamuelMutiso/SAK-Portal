from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import LeaveRequest
from app.schemas import LeaveRequestSchema
from app.services.sms import send_sms
from app.utils.roles import current_user, roles_required, viewable_student

leave_bp = Blueprint("leave", __name__, url_prefix="/api/leave")
schema = LeaveRequestSchema()


@leave_bp.get("")
@jwt_required()
def list_requests():
    user = current_user()
    query = LeaveRequest.query
    if user.role == "parent":
        query = query.filter_by(parent_id=user.id)
    elif user.role not in ("admin", "director"):
        return jsonify(error="You do not have access to this"), 403
    requests_list = query.order_by(LeaveRequest.created_at.desc()).all()
    return jsonify(schema.dump(requests_list, many=True))


@leave_bp.post("")
@roles_required("parent")
def create_request():
    data = schema.load(request.get_json() or {})
    student = viewable_student(data["student_id"])
    if not student.is_boarder:
        return jsonify(error="Leave-out requests are for boarders only"), 400
    leave = LeaveRequest(**data, parent_id=current_user().id)
    db.session.add(leave)
    db.session.commit()
    return jsonify(schema.dump(leave)), 201


@leave_bp.patch("/<int:leave_id>")
@roles_required("admin")
def decide(leave_id):
    leave = db.get_or_404(LeaveRequest, leave_id)
    status = (request.get_json() or {}).get("status")
    if status not in ("approved", "declined"):
        return jsonify(error="Status must be approved or declined"), 400
    leave.status = status
    db.session.commit()

    when = leave.leave_date.strftime("%a %d %b")
    if status == "approved":
        message = f"Success Academy: Leave-out for {leave.student.first_name} on {when} is approved. Pick-up by {leave.picked_by}."
    else:
        message = f"Success Academy: Leave-out for {leave.student.first_name} on {when} was not approved. Please call the office."
    sms = send_sms([leave.parent.phone], message)
    sms["message"] = message
    return jsonify(leave=schema.dump(leave), sms=sms)
