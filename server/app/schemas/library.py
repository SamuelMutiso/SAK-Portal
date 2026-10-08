from marshmallow import fields, validate
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models import Book, Loan


class BookSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Book

    title = fields.String(required=True, validate=validate.Length(min=2, max=150))
    copies = fields.Integer(load_default=1, validate=validate.Range(min=1, max=500))
    available = fields.Integer(dump_only=True)


class LoanSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Loan
        include_fk = True

    book_title = fields.Function(lambda obj: obj.book.title, dump_only=True)
    student_name = fields.Function(lambda obj: obj.student.full_name, dump_only=True)
    classroom_name = fields.Function(lambda obj: obj.student.classroom.name if obj.student.classroom else None, dump_only=True)
