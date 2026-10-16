from marshmallow import Schema, ValidationError, fields, validate, validates_schema

from app.curriculum import TERMS
from app.models.fees import CATEGORIES, LEARNER_TYPES
from app.models.payment import METHODS


class FeeItemSchema(Schema):
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=2, max=80))
    category = fields.String(load_default="other", validate=validate.OneOf(CATEGORIES))
    description = fields.String(load_default=None, allow_none=True)
    is_active = fields.Boolean(load_default=True)
    sort_order = fields.Integer(load_default=0)


class FeeRateSchema(Schema):
    id = fields.Integer(dump_only=True)
    item_id = fields.Integer(required=True)
    term = fields.String(required=True, validate=validate.OneOf(TERMS))
    classroom_id = fields.Integer(load_default=None, allow_none=True)
    learner_type = fields.String(load_default="all", validate=validate.OneOf(LEARNER_TYPES))
    transport_route_id = fields.Integer(load_default=None, allow_none=True)
    amount = fields.Integer(required=True, validate=validate.Range(min=0, max=1000000))
    item_name = fields.Function(lambda obj: obj.item.name, dump_only=True)
    classroom_name = fields.Function(lambda obj: obj.classroom.name if obj.classroom else None, dump_only=True)
    route_name = fields.Function(lambda obj: obj.transport_route.name if obj.transport_route else None, dump_only=True)


class DiscountSchema(Schema):
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=2, max=80))
    kind = fields.String(load_default="percent", validate=validate.OneOf(("percent", "fixed")))
    value = fields.Integer(required=True, validate=validate.Range(min=1, max=1000000))
    applies_to = fields.String(load_default="tuition", validate=validate.OneOf(CATEGORIES + ("all",)))
    is_active = fields.Boolean(load_default=True)
    learners = fields.Function(lambda obj: len(obj.students), dump_only=True)

    @validates_schema
    def percent_range(self, data, **kwargs):
        if data.get("kind", "percent") == "percent" and data.get("value", 0) > 100:
            raise ValidationError("A percentage discount cannot be more than 100", "value")


class InvoiceLineSchema(Schema):
    id = fields.Integer()
    description = fields.String()
    category = fields.String()
    amount = fields.Integer()


class InvoiceSchema(Schema):
    id = fields.Integer()
    number = fields.String()
    student_id = fields.Integer()
    student_name = fields.Function(lambda obj: obj.student.full_name)
    admission_number = fields.Function(lambda obj: obj.student.admission_number)
    classroom_name = fields.Function(lambda obj: obj.student.classroom.name if obj.student.classroom else obj.student.last_classroom_name)
    term = fields.String()
    issued_on = fields.Date()
    due_date = fields.Date()
    status = fields.String()
    total = fields.Integer()
    paid_amount = fields.Integer()
    balance = fields.Integer()
    note = fields.String()
    cancelled_reason = fields.String()
    lines = fields.List(fields.Nested(InvoiceLineSchema))


class LedgerPaymentSchema(Schema):
    id = fields.Integer()
    student_id = fields.Integer()
    student_name = fields.Function(lambda obj: obj.student.full_name)
    admission_number = fields.Function(lambda obj: obj.student.admission_number)
    classroom_name = fields.Function(lambda obj: obj.student.classroom.name if obj.student.classroom else obj.student.last_classroom_name)
    amount = fields.Integer()
    method = fields.String()
    status = fields.String()
    reference = fields.String()
    receipt = fields.String()
    receipt_number = fields.String()
    bank_name = fields.String()
    phone = fields.String()
    note = fields.String()
    paid_on = fields.Date()
    created_at = fields.DateTime()
    recorded_by = fields.Function(lambda obj: obj.recorded_by.full_name if obj.recorded_by else ("Parent via M-Pesa" if obj.method == "M-Pesa" else None))
    reversed_reason = fields.String()
    reversed_by = fields.Function(lambda obj: obj.reversed_by.full_name if obj.reversed_by else None)


class RecordPaymentSchema(Schema):
    student_id = fields.Integer(required=True)
    amount = fields.Integer(required=True, validate=validate.Range(min=1, max=1000000))
    method = fields.String(required=True, validate=validate.OneOf(METHODS))
    reference = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=60))
    bank_name = fields.String(load_default=None, allow_none=True)
    paid_on = fields.Date(load_default=None, allow_none=True)
    note = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=200))

    @validates_schema
    def reference_needed(self, data, **kwargs):
        if data["method"] in ("Bank", "Cheque", "M-Pesa", "Paybill") and not (data.get("reference") or "").strip():
            raise ValidationError("Enter the transaction, slip or cheque number", "reference")


class GenerateSchema(Schema):
    term = fields.String(required=True, validate=validate.OneOf(TERMS))
    classroom_ids = fields.List(fields.Integer(), load_default=list)
    due_date = fields.Date(load_default=None, allow_none=True)


class ReasonSchema(Schema):
    reason = fields.String(required=True, validate=validate.Length(min=5, max=300))
