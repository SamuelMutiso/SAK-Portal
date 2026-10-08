from marshmallow import fields, validate
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models import AuthorizedPickup


class PickupSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = AuthorizedPickup
        include_fk = True
        dump_only = ("student_id",)

    full_name = fields.String(required=True, validate=validate.Length(min=3, max=120))
    relationship = fields.String(required=True, validate=validate.Length(min=2, max=40))
    phone = fields.String(required=True, validate=validate.Regexp(r"^\+?\d{9,13}$"))
