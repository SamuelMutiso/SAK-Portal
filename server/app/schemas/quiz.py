from marshmallow import Schema, ValidationError, fields, validate, validates_schema

from app.models.quiz import PURPOSES, QUESTION_KINDS


class QuestionSchema(Schema):
    kind = fields.String(required=True, validate=validate.OneOf(QUESTION_KINDS))
    prompt = fields.String(required=True, validate=validate.Length(min=2, max=2000))
    options = fields.List(fields.String(validate=validate.Length(min=1, max=300)), load_default=None, allow_none=True)
    answer = fields.String(required=True, validate=validate.Length(min=1, max=500))
    explanation = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=2000))
    points = fields.Integer(load_default=1, validate=validate.Range(min=1, max=10))

    @validates_schema
    def check(self, data, **kwargs):
        if data["kind"] == "choice":
            options = [item.strip() for item in data.get("options") or [] if item.strip()]
            if not 2 <= len(options) <= 6:
                raise ValidationError("A multiple choice question needs 2 to 6 choices", "options")
            if not data["answer"].isdigit() or int(data["answer"]) >= len(options):
                raise ValidationError("Pick the correct choice", "answer")
            data["options"] = options
        else:
            data["options"] = None
            if not data["answer"].strip():
                raise ValidationError("Add at least one accepted answer", "answer")


class QuizSchema(Schema):
    classroom_id = fields.Integer(required=True)
    purpose = fields.String(load_default="practice", validate=validate.OneOf(PURPOSES))
    subject = fields.String(required=True, validate=validate.Length(min=2, max=60))
    topic = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=120))
    title = fields.String(required=True, validate=validate.Length(min=3, max=150))
    instructions = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=2000))
    time_limit = fields.Integer(load_default=None, allow_none=True, validate=validate.Range(min=1, max=180))
    is_published = fields.Boolean(load_default=False)
    questions = fields.List(fields.Nested(QuestionSchema), required=True, validate=validate.Length(min=1, max=60))


class StartSchema(Schema):
    student_id = fields.Integer(load_default=None, allow_none=True)
    candidate_name = fields.String(load_default=None, allow_none=True, validate=validate.Length(min=3, max=120))
    candidate_phone = fields.String(load_default=None, allow_none=True, validate=validate.Regexp(r"^\+?\d{9,13}$", error="Enter a valid phone number"))


class SubmitSchema(Schema):
    answers = fields.Dict(keys=fields.String(validate=validate.Length(max=12)), values=fields.Raw(allow_none=True), required=True, validate=validate.Length(max=60))
