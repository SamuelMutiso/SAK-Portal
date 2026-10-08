from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import Event
from app.schemas import EventSchema
from app.utils.roles import roles_required

events_bp = Blueprint("events", __name__, url_prefix="/api/events")
schema = EventSchema()


@events_bp.get("")
@jwt_required()
def list_events():
    events = Event.query.order_by(Event.start_date).all()
    return jsonify(schema.dump(events, many=True))


@events_bp.post("")
@roles_required("admin")
def create_event():
    data = schema.load(request.get_json() or {})
    event = Event(**data)
    db.session.add(event)
    db.session.commit()
    return jsonify(schema.dump(event)), 201


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
