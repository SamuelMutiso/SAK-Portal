import math
from datetime import date, datetime, time, timedelta, timezone

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db, limiter
from app.models import Student, TransportLog, TransportRoute
from app.models.transport_log import TRIP_EVENTS
from app.schemas import StudentSchema, TransportRouteSchema
from app.services.sms import send_sms
from app.utils.roles import current_user, roles_required, viewable_student

trips_bp = Blueprint("trips", __name__, url_prefix="/api/trips")

ALLOWED_AFTER = {
    "boarded": (None, "dropped"),
    "arrived": ("boarded",),
    "left": (None, "arrived", "dropped"),
    "dropped": ("boarded", "left"),
}
LABELS = {"boarded": "Picked up", "arrived": "Arrived at school", "left": "Left school", "dropped": "Dropped off"}
ON_BUS = ("boarded", "left")


def today_start():
    return datetime.combine(date.today(), time.min).astimezone(timezone.utc).replace(tzinfo=None)


def today_logs(student_ids):
    if not student_ids:
        return []
    return TransportLog.query.filter(TransportLog.student_id.in_(student_ids), TransportLog.recorded_at >= today_start()).order_by(TransportLog.recorded_at, TransportLog.id).all()


def log_dump(log):
    return {"student_id": log.student_id, "event": log.event, "label": LABELS.get(log.event, log.event), "recorded_at": log.recorded_at.isoformat()}


def latest_by_student(logs):
    latest = {}
    for log in logs:
        latest[log.student_id] = log
    return latest


def stop_order(route):
    return {stop.get("name"): index for index, stop in enumerate(route.stops or [])}


def message_for(student, route, event):
    clock = datetime.now().strftime("%I:%M %p").lstrip("0")
    stop = student.transport_stop or "the usual stop"
    texts = {
        "boarded": f"{student.first_name} was picked up by the school bus at {stop} at {clock}.",
        "arrived": f"{student.first_name} arrived safely at school at {clock} on the {route.name} bus.",
        "left": f"{student.first_name} left school on the {route.name} bus at {clock}.",
        "dropped": f"{student.first_name} was dropped off at {stop} at {clock}.",
    }
    return f"Success Academy: {texts[event]}"


def record(student, route, driver, event):
    log = TransportLog(student_id=student.id, route_id=route.id, event=event, driver_id=driver.id)
    db.session.add(log)
    return log


def driver_route():
    return TransportRoute.query.filter_by(driver_id=current_user().id).first()


@trips_bp.get("/my-route")
@roles_required("driver")
def my_route():
    route = driver_route()
    if not route:
        return jsonify(route=None, students=[], logs=[])
    order = stop_order(route)
    students = sorted((student for student in route.students if student.status == "active"),
                      key=lambda student: (order.get(student.transport_stop, 99), student.first_name))
    logs = today_logs([student.id for student in students])
    return jsonify(
        route=TransportRouteSchema().dump(route),
        students=StudentSchema(many=True).dump(students),
        logs=[log_dump(log) for log in logs],
        sharing=is_live(route),
        practice=current_app.config["BUS_PRACTICE"],
    )


@trips_bp.post("/log")
@limiter.limit("300 per hour")
@roles_required("driver")
def record_event():
    driver = current_user()
    data = request.get_json() or {}
    event = data.get("event")
    if event not in TRIP_EVENTS:
        return jsonify(error="Unknown bus update"), 400
    route = driver_route()
    student = db.get_or_404(Student, data.get("student_id"))
    if not route or student.transport_route_id != route.id:
        return jsonify(error="This learner is not on your route"), 403
    last = latest_by_student(today_logs([student.id])).get(student.id)
    if (last.event if last else None) not in ALLOWED_AFTER[event]:
        return jsonify(error=f"{student.first_name} cannot be marked '{LABELS[event].lower()}' right now"), 409
    log = record(student, route, driver, event)
    db.session.commit()
    message = message_for(student, route, event)
    sms = send_sms([student.parent.phone] if student.parent else [], message)
    sms["message"] = message
    return jsonify(log=log_dump(log), sms=sms), 201


@trips_bp.post("/bulk")
@limiter.limit("60 per hour")
@roles_required("driver")
def record_bulk():
    driver = current_user()
    data = request.get_json() or {}
    event = data.get("event")
    if event not in ("arrived", "left"):
        return jsonify(error="Only arrivals at school and leaving school can be done for the whole bus"), 400
    route = driver_route()
    if not route:
        return jsonify(error="You have not been assigned a route"), 403
    students = [student for student in route.students if student.status == "active"]
    latest = latest_by_student(today_logs([student.id for student in students]))
    chosen = set(data.get("student_ids") or [])
    picked = []
    for student in students:
        last_event = latest[student.id].event if student.id in latest else None
        if event == "arrived" and last_event == "boarded":
            picked.append(student)
        elif event == "left" and chosen and student.id in chosen and last_event in ALLOWED_AFTER["left"]:
            picked.append(student)
        elif event == "left" and not chosen and last_event == "arrived":
            picked.append(student)
    logs = [record(student, route, driver, event) for student in picked]
    db.session.commit()
    for student in picked:
        if student.parent:
            send_sms([student.parent.phone], message_for(student, route, event))
    return jsonify(count=len(picked), logs=[log_dump(log) for log in logs],
                   sms={"recipients": sum(1 for student in picked if student.parent), "message": message_for(picked[0], route, event) if picked else None}), 201


@trips_bp.get("/today")
@roles_required("admin", "teacher")
def today_board():
    user = current_user()
    routes = TransportRoute.query.order_by(TransportRoute.name).all()
    board = []
    for route in routes:
        students = [student for student in route.students if student.status == "active"]
        if user.role == "teacher":
            students = [student for student in students if student.classroom and student.classroom.teacher_id == user.id]
        latest = latest_by_student(today_logs([student.id for student in students]))
        order = stop_order(route)
        rows = []
        for student in sorted(students, key=lambda item: (order.get(item.transport_stop, 99), item.first_name)):
            last = latest.get(student.id)
            rows.append({"id": student.id, "full_name": student.full_name, "classroom_name": student.classroom.name if student.classroom else None,
                         "stop": student.transport_stop, "status": last.event if last else None,
                         "label": LABELS.get(last.event) if last else "Not picked up yet", "at": last.recorded_at.isoformat() if last else None})
        if user.role == "teacher" and not rows:
            continue
        board.append({
            "id": route.id, "name": route.name, "vehicle": route.vehicle, "live": is_live(route), "driver_name": route.driver_name, "driver_phone": route.driver_phone,
            "counts": {"waiting": sum(1 for row in rows if row["status"] is None),
                       "on_bus": sum(1 for row in rows if row["status"] in ON_BUS),
                       "at_school": sum(1 for row in rows if row["status"] == "arrived"),
                       "home": sum(1 for row in rows if row["status"] == "dropped")},
            "learners": rows,
        })
    return jsonify(routes=board)


@trips_bp.get("/student/<int:student_id>")
@jwt_required()
def student_trips(student_id):
    student = viewable_student(student_id)
    return jsonify([{**log_dump(log), "stop": student.transport_stop} for log in today_logs([student.id])])


LIVE_FOR = timedelta(minutes=3)
BUS_SPEED_KMH = 22


def distance_km(lat1, lng1, lat2, lng2):
    radius = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return radius * 2 * math.asin(math.sqrt(a))


def is_live(route):
    return bool(route.live_at and datetime.utcnow() - route.live_at <= LIVE_FOR)


@trips_bp.post("/location")
@limiter.limit("1200 per hour")
@roles_required("driver")
def share_location():
    route = driver_route()
    if not route:
        return jsonify(error="You have not been assigned a route"), 403
    data = request.get_json() or {}
    try:
        lat, lng = float(data.get("lat")), float(data.get("lng"))
    except (TypeError, ValueError):
        return jsonify(error="Location not understood"), 400
    if not (-5 <= lat <= 5 and 33 <= lng <= 42.5):
        return jsonify(error="That location is outside Kenya"), 400
    route.live_lat, route.live_lng, route.live_at = round(lat, 6), round(lng, 6), datetime.utcnow()
    db.session.commit()
    return jsonify(live=True, at=route.live_at.isoformat())


@trips_bp.post("/location/stop")
@roles_required("driver")
def stop_location():
    route = driver_route()
    if route:
        route.live_lat = route.live_lng = route.live_at = None
        db.session.commit()
    return jsonify(live=False)


@trips_bp.get("/live/<int:route_id>")
@jwt_required()
def live_bus(route_id):
    user = current_user()
    route = db.get_or_404(TransportRoute, route_id)
    if user.role == "parent":
        children = [child for child in user.children if child.transport_route_id == route.id and child.status == "active"]
        if not children:
            return jsonify(error="You do not have access to this"), 403
    elif user.role == "driver":
        if route.driver_id != user.id:
            return jsonify(error="You do not have access to this"), 403
        children = []
    elif user.role in ("admin", "director", "teacher"):
        children = []
    else:
        return jsonify(error="You do not have access to this"), 403
    live = is_live(route)
    stops = {stop.get("name"): stop for stop in route.stops or []}
    latest = latest_by_student(today_logs([child.id for child in children]))
    eta = []
    if live:
        for child in children:
            stop = stops.get(child.transport_stop)
            last = latest.get(child.id)
            heading = last.event if last else None
            target = stops.get((route.stops or [{}])[0].get("name")) if heading == "boarded" else stop
            if not target or heading in ("arrived", "dropped"):
                continue
            km = distance_km(route.live_lat, route.live_lng, target["lat"], target["lng"]) * 1.3
            eta.append({"student_id": child.id, "first_name": child.first_name, "to": "school" if heading == "boarded" else child.transport_stop,
                        "km": round(km, 1), "minutes": max(1, round(km / BUS_SPEED_KMH * 60))})
    return jsonify(
        route_id=route.id, name=route.name, live=live,
        lat=route.live_lat if live else None, lng=route.live_lng if live else None,
        at=route.live_at.isoformat() if live else None,
        stops=route.stops or [], eta=eta,
        practice=current_app.config["BUS_PRACTICE"] and user.role == "driver",
    )
