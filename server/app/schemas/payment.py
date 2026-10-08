from marshmallow import Schema, fields, validate
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models import Payment


class PaymentSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Payment
        include_fk = True


class PayRequestSchema(Schema):
    student_id = fields.Integer(required=True)
    amount = fields.Integer(required=True, validate=validate.Range(min=10, max=500000))
    phone = fields.String(required=True, validate=validate.Regexp(r"^\+?\d{9,13}$"))
