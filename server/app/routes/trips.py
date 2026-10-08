from datetime import date, datetime, time

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import Student, TransportLog, TransportRoute
from app.models.transport_log import TRIP_EVENTS
from app.schemas import StudentSchema, TransportRouteSchema
from app.services.sms import send_sms
from app.utils.roles import current_user, roles_required, viewable_student

trips_bp = Blueprint("trips", __name__, url_prefix="/api/trips")


def today_logs(student_ids):
    start = datetime.combine(date.today(), time.min)
    return TransportLog.query.filter(TransportLog.student_id.in_(student_ids), TransportLog.recorded_at >= start).all()


def log_dump(log):
    return {"student_id": log.student_id, "event": log.event, "recorded_at": log.recorded_at.isoformat()}


@trips_bp.get("/my-route")
@roles_required("driver")
def my_route():
    route = TransportRoute.query.filter_by(driver_id=current_user().id).first()
    if not route:
        return jsonify(route=None, students=[], logs=[])
    students = sorted(route.students, key=lambda student: student.first_name)
    logs = today_logs([student.id for student in students])
    return jsonify(
        route=TransportRouteSchema().dump(route),
        students=StudentSchema(many=True).dump(students),
        logs=[log_dump(log) for log in logs],
    )


@trips_bp.post("/log")
@roles_required("driver")
def record_event():
    driver = current_user()
    data = request.get_json() or {}
    if data.get("event") not in TRIP_EVENTS:
        return jsonify(error="Event must be boarded or dropped"), 400
    route = TransportRoute.query.filter_by(driver_id=driver.id).first()
    student = db.get_or_404(Student, data.get("student_id"))
    if not route or student.transport_route_id != route.id:
        return jsonify(error="This learner is not on your route"), 403

    log = TransportLog(student_id=student.id, route_id=route.id, event=data["event"], driver_id=driver.id)
    db.session.add(log)
    db.session.commit()

    clock = datetime.now().strftime("%I:%M %p").lstrip("0")
    action = "boarded the school bus" if log.event == "boarded" else "has been dropped off"
    message = f"Success Academy: {student.first_name} {action} at {clock} ({route.name})."
    sms = send_sms([student.parent.phone] if student.parent else [], message)
    sms["message"] = message
    return jsonify(log=log_dump(log), sms=sms), 201


@trips_bp.get("/student/<int:student_id>")
@jwt_required()
def student_trips(student_id):
    student = viewable_student(student_id)
    return jsonify([log_dump(log) for log in today_logs([student.id])])
