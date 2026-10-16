from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from marshmallow import Schema, fields

from app.extensions import db
from app.models import PromotionRun, SchoolTerm
from app.services.school_year import promotion_preview, run_promotion, this_year
from app.utils.roles import current_user, roles_required

school_year_bp = Blueprint("school_year", __name__, url_prefix="/api/school-year")


class TermSchema(Schema):
    id = fields.Integer(dump_only=True)
    name = fields.String(dump_only=True)
    year = fields.Integer(dump_only=True)
    number = fields.Integer(dump_only=True)
    start_date = fields.Date(allow_none=True)
    end_date = fields.Date(allow_none=True)
    fee_due_date = fields.Date(allow_none=True)
    is_current = fields.Boolean(dump_only=True)


class PromotionSchema(Schema):
    from_year = fields.Integer(required=True)
    hold_back = fields.List(fields.Integer(), load_default=list)
    start_next_year = fields.Boolean(load_default=True)


def run_payload(run):
    return {"from_year": run.from_year, "to_year": run.to_year, "promoted": run.promoted, "repeated": run.repeated,
            "completed": run.completed, "run_by": run.run_by.full_name if run.run_by else None, "run_at": run.run_at.isoformat()}


@school_year_bp.get("/terms")
@jwt_required()
def list_terms():
    terms = SchoolTerm.query.order_by(SchoolTerm.year, SchoolTerm.number).all()
    return jsonify(current_year=this_year(), terms=TermSchema(many=True).dump(terms))


@school_year_bp.patch("/terms/<int:term_id>")
@roles_required("admin")
def update_term(term_id):
    term = db.get_or_404(SchoolTerm, term_id)
    data = TermSchema().load(request.get_json() or {}, partial=True)
    for field, value in data.items():
        setattr(term, field, value)
    if term.start_date and term.end_date and term.end_date <= term.start_date:
        return jsonify(error="The term must end after it starts"), 400
    db.session.commit()
    return jsonify(TermSchema().dump(term))


@school_year_bp.post("/terms/<int:term_id>/current")
@roles_required("admin")
def set_current(term_id):
    term = db.get_or_404(SchoolTerm, term_id)
    SchoolTerm.query.update({SchoolTerm.is_current: False})
    term.is_current = True
    db.session.commit()
    return jsonify(TermSchema().dump(term))


@school_year_bp.get("/promotion")
@roles_required("admin")
def preview():
    from_year = request.args.get("from_year", type=int) or this_year()
    runs = PromotionRun.query.order_by(PromotionRun.from_year.desc()).all()
    return jsonify(**promotion_preview(from_year), runs=[run_payload(run) for run in runs])


@school_year_bp.post("/promotion")
@roles_required("admin")
def promote():
    data = PromotionSchema().load(request.get_json() or {})
    try:
        run = run_promotion(current_user(), data["from_year"], data["hold_back"])
    except ValueError as error:
        return jsonify(error=str(error)), 400
    if data["start_next_year"]:
        first = SchoolTerm.query.filter_by(year=data["from_year"] + 1, number=1).first()
        if first:
            SchoolTerm.query.update({SchoolTerm.is_current: False})
            first.is_current = True
    db.session.commit()
    return jsonify(run_payload(run)), 201
