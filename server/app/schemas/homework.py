from marshmallow import fields, validate
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models import Homework


class HomeworkSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Homework
        include_fk = True
        dump_only = ("teacher_id", "created_at")

    classroom_id = fields.Integer(required=True)
    subject = fields.String(required=True, validate=validate.Length(min=2, max=60))
    title = fields.String(required=True, validate=validate.Length(min=3, max=150))
    due_date = fields.Date(required=True)
    classroom_name = fields.Function(lambda obj: obj.classroom.name, dump_only=True)
