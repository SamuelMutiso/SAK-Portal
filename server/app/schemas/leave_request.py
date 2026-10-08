from marshmallow import ValidationError, fields, validate, validates_schema
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models import LeaveRequest


class LeaveRequestSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = LeaveRequest
        include_fk = True
        dump_only = ("parent_id", "status", "created_at")

    student_id = fields.Integer(required=True)
    leave_date = fields.Date(required=True)
    return_date = fields.Date(required=True)
    reason = fields.String(required=True, validate=validate.Length(min=3))
    picked_by = fields.String(required=True, validate=validate.Length(min=3, max=120))
    student_name = fields.Function(lambda obj: obj.student.full_name, dump_only=True)
    classroom_name = fields.Function(lambda obj: obj.student.classroom.name, dump_only=True)
    parent_name = fields.Function(lambda obj: obj.parent.full_name, dump_only=True)

    @validates_schema
    def check_dates(self, data, **kwargs):
        if data["return_date"] < data["leave_date"]:
            raise ValidationError("Return date must be after the leave date", "return_date")
