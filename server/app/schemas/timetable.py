from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models import TimetableSlot


class TimetableSlotSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = TimetableSlot
        include_fk = True
