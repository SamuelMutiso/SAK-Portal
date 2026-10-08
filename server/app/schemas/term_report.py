from marshmallow import fields
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models import TermReport


class TermReportSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = TermReport
        include_fk = True
        dump_only = ("student_id", "term", "updated_at")

    competencies = fields.Dict(load_default=dict)
    values = fields.Dict(load_default=dict)
    closing_date = fields.Date(allow_none=True)
    opening_date = fields.Date(allow_none=True)
