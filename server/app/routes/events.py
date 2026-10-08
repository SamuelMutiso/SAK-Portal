from datetime import date

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import Event, User
from app.schemas import EventSchema
from app.services.sms import send_sms
from app.utils.roles import roles_required

events_bp = Blueprint("events", __name__, url_prefix="/api/events")
schema = EventSchema()


def event_message(event):
    when = event.start_date.strftime("%A %d %B")
    place = f" at {event.location}" if event.location else ""
    return f"Success Academy reminder: {event.title} is on {when}{place}."


def remind_parents(event):
    parents = User.query.filter_by(role="parent", is_active=True).all()
    message = event_message(event)
    result = send_sms([parent.phone for parent in parents], message)
    result["message"] = message
    return result


@events_bp.get("")
@jwt_required()
def list_events():
    events = Event.query.order_by(Event.start_date).all()
    return jsonify(schema.dump(events, many=True))


@events_bp.post("")
@roles_required("admin")
def create_event():
    payload = request.get_json() or {}
    notify = bool(payload.pop("notify_parents", False))
    data = schema.load(payload)
    event = Event(**data)
    db.session.add(event)
    db.session.commit()
    sms = remind_parents(event) if notify else None
    return jsonify(event=schema.dump(event), sms=sms), 201


@events_bp.post("/<int:event_id>/remind")
@roles_required("admin")
def send_reminder(event_id):
    event = db.get_or_404(Event, event_id)
    if event.start_date < date.today():
        return jsonify(error="This event has already passed"), 400
    return jsonify(sms=remind_parents(event))


@events_bp.patch("/<int:event_id>")
@roles_required("admin")
def update_event(event_id):
    event = db.get_or_404(Event, event_id)
    data = schema.load(request.get_json() or {}, partial=True)
    for field, value in data.items():
        setattr(event, field, value)
    db.session.commit()
    return jsonify(schema.dump(event))


@events_bp.delete("/<int:event_id>")
@roles_required("admin")
def delete_event(event_id):
    event = db.get_or_404(Event, event_id)
    db.session.delete(event)
    db.session.commit()
    return "", 204
