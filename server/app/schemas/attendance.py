from marshmallow import Schema, fields, validate
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models import Attendance
from app.models.attendance import STATUSES


class AttendanceSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Attendance
        include_fk = True

    student_name = fields.Function(lambda obj: obj.student.full_name, dump_only=True)


class AttendanceEntrySchema(Schema):
    student_id = fields.Integer(required=True)
    status = fields.String(required=True, validate=validate.OneOf(STATUSES))


class AttendanceBatchSchema(Schema):
    date = fields.Date(required=True)
    records = fields.List(fields.Nested(AttendanceEntrySchema), required=True)
