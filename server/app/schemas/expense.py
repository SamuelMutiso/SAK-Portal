from datetime import date, timedelta

from marshmallow import Schema, ValidationError, fields, validate, validates

from app.models.expense import CATEGORIES, METHODS


class ExpenseSchema(Schema):
    spent_on = fields.Date(required=True)
    category = fields.String(required=True, validate=validate.OneOf(CATEGORIES))
    description = fields.String(required=True, validate=validate.Length(min=3, max=200))
    amount = fields.Integer(required=True, validate=validate.Range(min=1, max=10_000_000))
    paid_to = fields.String(required=True, validate=validate.Length(min=2, max=120))
    method = fields.String(load_default="Cash", validate=validate.OneOf(METHODS))
    reference = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=60))

    @validates("spent_on")
    def check_date(self, value, **kwargs):
        if value > date.today():
            raise ValidationError("The date cannot be in the future")
        if value < date.today() - timedelta(days=90):
            raise ValidationError("Expenses older than 90 days cannot be added")


class VoidSchema(Schema):
    reason = fields.String(required=True, validate=validate.Length(min=5, max=300))
