from marshmallow import fields
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.curriculum import learning_areas_for, uses_marks
from app.models import Classroom


class ClassroomSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Classroom
        include_fk = True

    teacher_name = fields.Function(lambda obj: obj.teacher.full_name if obj.teacher else None, dump_only=True)
    student_count = fields.Function(lambda obj: len(obj.students), dump_only=True)
    learning_areas = fields.Function(lambda obj: learning_areas_for(obj.level), dump_only=True)
    uses_marks = fields.Function(lambda obj: uses_marks(obj.level), dump_only=True)
