from marshmallow import fields, validate, validates_schema, ValidationError
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models import Notice
from app.models.notice import AUDIENCES


class NoticeSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Notice
        include_fk = True
        dump_only = ("author_id", "sms_count", "created_at")

    title = fields.String(required=True, validate=validate.Length(min=3, max=150))
    body = fields.String(required=True, validate=validate.Length(min=3))
    audience = fields.String(load_default="all", validate=validate.OneOf(AUDIENCES))
    author_name = fields.Function(lambda obj: obj.author.full_name, dump_only=True)
    target_name = fields.Method("get_target_name", dump_only=True)

    def get_target_name(self, obj):
        if obj.audience == "class" and obj.classroom:
            return obj.classroom.name
        if obj.audience == "club" and obj.club:
            return obj.club.name
        if obj.audience == "route" and obj.transport_route:
            return obj.transport_route.name
        if obj.audience == "boarders":
            return "Boarders"
        return "Whole school"

    @validates_schema
    def check_target(self, data, **kwargs):
        required = {"class": "classroom_id", "club": "club_id", "route": "transport_route_id"}
        field = required.get(data.get("audience"))
        if field and not data.get(field):
            raise ValidationError(f"{field} is required for this audience", field)
