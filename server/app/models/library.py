from app.extensions import db


class Book(db.Model):
    __tablename__ = "books"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    author = db.Column(db.String(120))
    level = db.Column(db.String(40))
    copies = db.Column(db.Integer, default=1)

    loans = db.relationship("Loan", back_populates="book")

    @property
    def available(self):
        return self.copies - sum(1 for loan in self.loans if loan.returned_on is None)


class Loan(db.Model):
    __tablename__ = "loans"

    id = db.Column(db.Integer, primary_key=True)
    book_id = db.Column(db.Integer, db.ForeignKey("books.id"), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    borrowed_on = db.Column(db.Date, nullable=False)
    due_on = db.Column(db.Date, nullable=False)
    returned_on = db.Column(db.Date)

    book = db.relationship("Book", back_populates="loans")
    student = db.relationship("Student")
