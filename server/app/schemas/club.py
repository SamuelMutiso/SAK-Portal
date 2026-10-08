from marshmallow import fields
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models import Club


class ClubSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Club
        include_fk = True

    patron_name = fields.Function(lambda obj: obj.patron.full_name if obj.patron else None, dump_only=True)
    member_count = fields.Function(lambda obj: len(obj.students), dump_only=True)
