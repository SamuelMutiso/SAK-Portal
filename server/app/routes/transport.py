from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import TransportRoute
from app.schemas import TransportRouteSchema
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
    for field, value in data.items():
        setattr(route, field, value)
    db.session.commit()
    return jsonify(schema.dump(route))
