from marshmallow import fields
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models import TransportRoute


class TransportRouteSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = TransportRoute
        exclude = ("live_lat", "live_lng", "live_at")

    stops = fields.List(fields.Dict(), load_default=list)
    student_count = fields.Function(lambda obj: len(obj.students), dump_only=True)
