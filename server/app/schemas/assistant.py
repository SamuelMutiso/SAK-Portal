from marshmallow import Schema, fields, validate


class TurnSchema(Schema):
    role = fields.String(required=True, validate=validate.OneOf(("user", "assistant")))
    content = fields.String(required=True, validate=validate.Length(min=1, max=3000))


class QuestionSchema(Schema):
    question = fields.String(required=True, validate=validate.Length(min=2, max=500))
    history = fields.List(fields.Nested(TurnSchema), load_default=list, validate=validate.Length(max=12))
