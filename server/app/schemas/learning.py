from marshmallow import Schema, fields, validate

from app.models.learning import KINDS


class MaterialSchema(Schema):
    id = fields.Integer(dump_only=True)
    classroom_id = fields.Integer(required=True)
    classroom_name = fields.Function(lambda obj: obj.classroom.name if obj.classroom else None, dump_only=True)
    subject = fields.String(required=True, validate=validate.Length(min=2, max=60))
    topic = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=120))
    title = fields.String(required=True, validate=validate.Length(min=3, max=150))
    kind = fields.String(load_default="notes", validate=validate.OneOf(KINDS))
    body = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=20000))
    link_url = fields.Url(load_default=None, allow_none=True, schemes={"https"}, validate=validate.Length(max=500))
    file_name = fields.String(dump_only=True)
    file_type = fields.String(dump_only=True)
    file_size = fields.Integer(dump_only=True)
    teacher_id = fields.Integer(dump_only=True)
    teacher_name = fields.Function(lambda obj: obj.teacher.full_name if obj.teacher else None, dump_only=True)
    created_at = fields.DateTime(dump_only=True)
