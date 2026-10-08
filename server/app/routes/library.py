from datetime import date, timedelta

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import Book, Loan, Student
from app.schemas import BookSchema, LoanSchema
from app.utils.roles import roles_required, viewable_student

library_bp = Blueprint("library", __name__, url_prefix="/api/library")


@library_bp.get("/books")
@roles_required("admin")
def list_books():
    books = Book.query.order_by(Book.title).all()
    return jsonify(BookSchema(many=True).dump(books))


@library_bp.post("/books")
@roles_required("admin")
def add_book():
    data = BookSchema().load(request.get_json() or {})
    book = Book(**data)
    db.session.add(book)
    db.session.commit()
    return jsonify(BookSchema().dump(book)), 201


@library_bp.get("/loans")
@roles_required("admin")
def open_loans():
    loans = Loan.query.filter(Loan.returned_on.is_(None)).order_by(Loan.due_on).all()
    return jsonify(LoanSchema(many=True).dump(loans))


@library_bp.post("/loans")
@roles_required("admin")
def lend():
    data = request.get_json() or {}
    book = db.get_or_404(Book, data.get("book_id"))
    student = Student.query.filter_by(admission_number=str(data.get("admission_number", "")).upper()).first()
    if not student:
        return jsonify(error="No learner with that admission number"), 404
    if book.available < 1:
        return jsonify(error="All copies of this book are out"), 400
    today = date.today()
    loan = Loan(book_id=book.id, student_id=student.id, borrowed_on=today, due_on=today + timedelta(days=14))
    db.session.add(loan)
    db.session.commit()
    return jsonify(LoanSchema().dump(loan)), 201


@library_bp.post("/loans/<int:loan_id>/return")
@roles_required("admin")
def return_book(loan_id):
    loan = db.get_or_404(Loan, loan_id)
    loan.returned_on = date.today()
    db.session.commit()
    return jsonify(LoanSchema().dump(loan))


@library_bp.get("/student/<int:student_id>")
@jwt_required()
def student_loans(student_id):
    viewable_student(student_id)
    loans = Loan.query.filter_by(student_id=student_id).order_by(Loan.borrowed_on.desc()).limit(10).all()
    return jsonify(LoanSchema(many=True).dump(loans))
