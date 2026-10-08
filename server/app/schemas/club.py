from marshmallow import fields, validate
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models import Club, ClubActivity


class ClubSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Club
        include_fk = True

    patron_name = fields.Function(lambda obj: obj.patron.full_name if obj.patron else None, dump_only=True)
    patron_phone = fields.Function(lambda obj: obj.patron.phone if obj.patron else None, dump_only=True)
    leader_name = fields.Function(lambda obj: obj.leader.full_name if obj.leader else None, dump_only=True)
    member_count = fields.Function(lambda obj: len(obj.students), dump_only=True)


class ClubActivitySchema(SQLAlchemyAutoSchema):
    class Meta:
        model = ClubActivity
        include_fk = True
        dump_only = ("club_id",)

    title = fields.String(required=True, validate=validate.Length(min=3, max=150))
    date = fields.Date(required=True)
