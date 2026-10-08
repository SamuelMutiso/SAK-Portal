from marshmallow import fields
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models import Student


class StudentSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Student
        include_fk = True

    full_name = fields.String(dump_only=True)
    classroom_name = fields.Function(lambda obj: obj.classroom.name if obj.classroom else None, dump_only=True)
    parent_name = fields.Function(lambda obj: obj.parent.full_name if obj.parent else None, dump_only=True)
    parent_phone = fields.Function(lambda obj: obj.parent.phone if obj.parent else None, dump_only=True)
    route_name = fields.Function(lambda obj: obj.transport_route.name if obj.transport_route else None, dump_only=True)
    clubs = fields.Function(lambda obj: [club.name for club in obj.clubs], dump_only=True)
