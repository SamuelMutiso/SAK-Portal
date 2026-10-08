from marshmallow import Schema, fields, validate
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models import DiaryEntry
from app.models.diary import MOODS


class DiarySchema(SQLAlchemyAutoSchema):
    class Meta:
        model = DiaryEntry
        include_fk = True

    student_name = fields.Function(lambda obj: obj.student.full_name, dump_only=True)


class DiaryRowSchema(Schema):
    student_id = fields.Integer(required=True)
    meals = fields.String(allow_none=True)
    nap = fields.String(allow_none=True)
    mood = fields.String(load_default="happy", validate=validate.OneOf(MOODS))
    activities = fields.String(allow_none=True)
    note = fields.String(allow_none=True)


class DiarySheetSchema(Schema):
    date = fields.Date(required=True)
    entries = fields.List(fields.Nested(DiaryRowSchema), required=True)
