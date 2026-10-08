from marshmallow import Schema, ValidationError, fields, validate, validates_schema
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models import Assessment
from app.models.assessment import EXAMS, LEVELS


class AssessmentSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Assessment
        include_fk = True
        dump_only = ("teacher_id",)

    student_id = fields.Integer(required=True)
    subject = fields.String(required=True, validate=validate.Length(min=2, max=60))
    term = fields.String(required=True)
    exam = fields.String(load_default="End-Term", validate=validate.OneOf(EXAMS))
    score = fields.Integer(allow_none=True, validate=validate.Range(min=0, max=100))
    level = fields.String(validate=validate.OneOf(LEVELS))
    student_name = fields.Function(lambda obj: obj.student.full_name, dump_only=True)


class SheetEntrySchema(Schema):
    student_id = fields.Integer(required=True)
    score = fields.Integer(allow_none=True, validate=validate.Range(min=0, max=100))
    level = fields.String(allow_none=True, validate=validate.OneOf(LEVELS))

    @validates_schema
    def needs_score_or_level(self, data, **kwargs):
        if data.get("score") is None and not data.get("level"):
            raise ValidationError("Enter a score or a level")


class GradeSheetSchema(Schema):
    subject = fields.String(required=True, validate=validate.Length(min=2, max=60))
    term = fields.String(required=True)
    exam = fields.String(required=True, validate=validate.OneOf(EXAMS))
    scores = fields.List(fields.Nested(SheetEntrySchema), required=True)
