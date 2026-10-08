from marshmallow import fields, validate
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models import Assessment
from app.models.assessment import LEVELS


class AssessmentSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Assessment
        include_fk = True
        dump_only = ("teacher_id",)

    student_id = fields.Integer(required=True)
    subject = fields.String(required=True, validate=validate.Length(min=2, max=60))
    term = fields.String(required=True)
    level = fields.String(required=True, validate=validate.OneOf(LEVELS))
    student_name = fields.Function(lambda obj: obj.student.full_name, dump_only=True)
