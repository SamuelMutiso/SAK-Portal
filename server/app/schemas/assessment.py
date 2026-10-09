from marshmallow import Schema, ValidationError, fields, validate, validates_schema
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.curriculum import TERMS
from app.models import Assessment
from app.models.assessment import EXAMS, LEVELS


class AssessmentSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Assessment
        include_fk = True
        dump_only = ("teacher_id",)

    student_id = fields.Integer(required=True)
    subject = fields.String(required=True, validate=validate.Length(min=2, max=60))
    term = fields.String(required=True, validate=validate.OneOf(TERMS))
    exam = fields.String(load_default="End-Term", validate=validate.OneOf(EXAMS))
    score = fields.Integer(allow_none=True, validate=validate.Range(min=0, max=100))
    level = fields.String(validate=validate.OneOf(LEVELS))
    reason = fields.String(load_only=True, validate=validate.Length(max=300))
    student_name = fields.Function(lambda obj: obj.student.full_name, dump_only=True)
    times_changed = fields.Function(lambda obj: len(obj.changes), dump_only=True)


class SheetEntrySchema(Schema):
    student_id = fields.Integer(required=True)
    score = fields.Integer(allow_none=True, validate=validate.Range(min=0, max=100))
    level = fields.String(allow_none=True, validate=validate.OneOf(LEVELS))
    reason = fields.String(allow_none=True, validate=validate.Length(max=300))

    @validates_schema
    def needs_score_or_level(self, data, **kwargs):
        if data.get("score") is None and not data.get("level"):
            raise ValidationError("Enter a score or a level")


class LearnerMarkSchema(SheetEntrySchema):
    student_id = fields.Integer(load_default=None)
    subject = fields.String(required=True, validate=validate.Length(min=2, max=60))


class LearnerSheetSchema(Schema):
    term = fields.String(required=True, validate=validate.OneOf(TERMS))
    exam = fields.String(required=True, validate=validate.OneOf(EXAMS))
    scores = fields.List(fields.Nested(LearnerMarkSchema), required=True)


class GradeSheetSchema(Schema):
    subject = fields.String(required=True, validate=validate.Length(min=2, max=60))
    term = fields.String(required=True, validate=validate.OneOf(TERMS))
    exam = fields.String(required=True, validate=validate.OneOf(EXAMS))
    scores = fields.List(fields.Nested(SheetEntrySchema), required=True)


class MarkChangeSchema(Schema):
    id = fields.Integer()
    old_score = fields.Integer()
    old_level = fields.String()
    new_score = fields.Integer()
    new_level = fields.String()
    reason = fields.String()
    changed_at = fields.DateTime()
    changed_by = fields.Function(lambda obj: obj.changed_by.full_name if obj.changed_by else None)
    student_id = fields.Function(lambda obj: obj.assessment.student_id)
    student_name = fields.Function(lambda obj: obj.assessment.student.full_name)
    classroom_name = fields.Function(lambda obj: obj.assessment.student.classroom.name if obj.assessment.student.classroom else None)
    subject = fields.Function(lambda obj: obj.assessment.subject)
    term = fields.Function(lambda obj: obj.assessment.term)
    exam = fields.Function(lambda obj: obj.assessment.exam)
