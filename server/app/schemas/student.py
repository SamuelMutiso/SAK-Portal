from marshmallow import Schema, fields, validate
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.curriculum import uses_marks
from app.models import Student


class StudentSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Student
        include_fk = True
        load_only = ("allergies", "medical_conditions")
        dump_only = ("status", "left_on", "leaving_reason", "last_classroom_name")

    full_name = fields.String(dump_only=True)
    classroom_name = fields.Function(lambda obj: obj.classroom.name if obj.classroom else None, dump_only=True)
    parent_name = fields.Function(lambda obj: obj.parent.full_name if obj.parent else None, dump_only=True)
    parent_phone = fields.Function(lambda obj: obj.parent.phone if obj.parent else None, dump_only=True)
    route_name = fields.Function(lambda obj: obj.transport_route.name if obj.transport_route else None, dump_only=True)
    clubs = fields.Function(lambda obj: [club.name for club in obj.clubs], dump_only=True)
    level = fields.Function(lambda obj: obj.classroom.level if obj.classroom else None, dump_only=True)
    uses_marks = fields.Function(lambda obj: uses_marks(obj.classroom.level) if obj.classroom else False, dump_only=True)


HEALTH_FIELDS = ("allergies", "medical_conditions")

RELATIONSHIPS = ("Mother", "Father", "Guardian", "Grandparent", "Aunt", "Uncle", "Sibling", "Other")


class GuardianSchema(Schema):
    full_name = fields.String(required=True, validate=validate.Length(min=3, max=120))
    phone = fields.String(required=True, validate=validate.Regexp(r"^(\+?254|0)[17]\d{8}$", error="Enter a Kenyan phone number like 0712345678"))
    email = fields.Email(load_default=None, allow_none=True)
    relationship = fields.String(load_default="Guardian", validate=validate.OneOf(RELATIONSHIPS))


class SecondGuardianSchema(Schema):
    full_name = fields.String(load_default=None, allow_none=True)
    phone = fields.String(load_default=None, allow_none=True)
    relationship = fields.String(load_default=None, allow_none=True)


class AdmissionSchema(Schema):
    first_name = fields.String(required=True, validate=validate.Length(min=2, max=60))
    last_name = fields.String(required=True, validate=validate.Length(min=2, max=60))
    gender = fields.String(required=True, validate=validate.OneOf(("Male", "Female")))
    date_of_birth = fields.Date(required=True)
    upi = fields.String(load_default=None, allow_none=True)
    assessment_number = fields.String(load_default=None, allow_none=True)
    home_address = fields.String(load_default=None, allow_none=True)
    previous_school = fields.String(load_default=None, allow_none=True)
    classroom_id = fields.Integer(required=True)
    is_boarder = fields.Boolean(load_default=False)
    transport_route_id = fields.Integer(load_default=None, allow_none=True)
    transport_stop = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=80))
    admission_date = fields.Date(load_default=None, allow_none=True)
    guardian = fields.Nested(GuardianSchema, required=True)
    guardian2 = fields.Nested(SecondGuardianSchema, load_default=dict)
    emergency_contact_name = fields.String(load_default=None, allow_none=True)
    emergency_contact_phone = fields.String(load_default=None, allow_none=True)
    allergies = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=300))
    medical_conditions = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=300))


class LeaveSchema(Schema):
    status = fields.String(required=True, validate=validate.OneOf(("transferred", "withdrawn")))
    reason = fields.String(required=True, validate=validate.Length(min=5, max=300))
    left_on = fields.Date(load_default=None, allow_none=True)


class HistorySchema(Schema):
    id = fields.Integer()
    year = fields.Integer()
    classroom_name = fields.String()
    outcome = fields.String()
    note = fields.String()
    created_at = fields.DateTime()
    recorded_by = fields.Function(lambda obj: obj.recorded_by.full_name if obj.recorded_by else None)
