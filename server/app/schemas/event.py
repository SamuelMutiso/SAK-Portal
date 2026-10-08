from marshmallow import fields, validate
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models import Event
from app.models.event import CATEGORIES


class EventSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Event

    title = fields.String(required=True, validate=validate.Length(min=3, max=150))
    category = fields.String(load_default="academic", validate=validate.OneOf(CATEGORIES))
    start_date = fields.Date(required=True)
