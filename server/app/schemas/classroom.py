from marshmallow import fields
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models import Classroom


class ClassroomSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Classroom
        include_fk = True

    teacher_name = fields.Function(lambda obj: obj.teacher.full_name if obj.teacher else None, dump_only=True)
    student_count = fields.Function(lambda obj: len(obj.students), dump_only=True)
