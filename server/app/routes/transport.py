import requests
from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db, limiter
from app.models import TransportRoute
from app.schemas import TransportRouteSchema
from app.services.geo import search_places
from app.utils.roles import current_user, roles_required

transport_bp = Blueprint("transport", __name__, url_prefix="/api/transport")
schema = TransportRouteSchema()


@transport_bp.get("")
@jwt_required()
def list_routes():
    user = current_user()
    query = TransportRoute.query.order_by(TransportRoute.name)
    if user.role == "parent":
        route_ids = {child.transport_route_id for child in user.children}
        query = query.filter(TransportRoute.id.in_(route_ids))
    return jsonify(schema.dump(query.all(), many=True))


@transport_bp.post("")
@roles_required("admin")
def create_route():
    data = schema.load(request.get_json() or {})
    route = TransportRoute(**data)
    db.session.add(route)
    db.session.commit()
    return jsonify(schema.dump(route)), 201


@transport_bp.patch("/<int:route_id>")
@roles_required("admin")
def update_route(route_id):
    route = db.get_or_404(TransportRoute, route_id)
    data = schema.load(request.get_json() or {}, partial=True)
    renames = {}
    if "stops" in data:
        stops, renames, problem = clean_stops(data["stops"])
        if problem:
            return jsonify(error=problem), 400
        data["stops"] = stops
    for field, value in data.items():
        setattr(route, field, value)
    if "stops" in data:
        names = {stop["name"] for stop in data["stops"][1:]}
        for student in route.students:
            student.transport_stop = renames.get(student.transport_stop, student.transport_stop)
            if student.transport_stop not in names:
                student.transport_stop = None
    db.session.commit()
    return jsonify(schema.dump(route))


def clean_stops(raw):
    if not isinstance(raw, list) or not 2 <= len(raw) <= 30:
        return None, None, "A route needs the school and at least one stop, and no more than 30 stops"
    stops, renames, seen = [], {}, set()
    for index, item in enumerate(raw):
        name = str(item.get("name") or "").strip()
        label = "The school" if index == 0 else f"Stop {index + 1}"
        if not 2 <= len(name) <= 60:
            return None, None, f"{label} needs a name of 2 to 60 letters"
        if name.lower() in seen:
            return None, None, f"There are two stops called {name}"
        seen.add(name.lower())
        try:
            lat, lng = float(item.get("lat")), float(item.get("lng"))
        except (TypeError, ValueError):
            return None, None, f"{label} ({name}) has no place on the map"
        if not (-5 <= lat <= 5 and 33 <= lng <= 42.5):
            return None, None, f"{name} is outside Kenya. Move its pin."
        was = str(item.get("was") or "").strip()
        if was and was != name:
            renames[was] = name
        stops.append({"name": name, "lat": round(lat, 6), "lng": round(lng, 6)})
    return stops, renames, None


@transport_bp.get("/places")
@limiter.limit("30 per minute")
@roles_required("admin")
def places():
    query = (request.args.get("q") or "").strip()
    if len(query) < 3:
        return jsonify(error="Type at least 3 letters of the place"), 400
    try:
        return jsonify(search_places(query[:80], current_app.config.get("PORTAL_URL", "")))
    except (requests.RequestException, ValueError, KeyError):
        return jsonify(error="Place search is not available right now. Drag the pin to the right spot instead."), 503
