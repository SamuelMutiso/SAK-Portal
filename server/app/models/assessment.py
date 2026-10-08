from app.extensions import db

LEVELS = ("EE", "ME", "AE", "BE")


class Assessment(db.Model):
    __tablename__ = "assessments"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    subject = db.Column(db.String(60), nullable=False)
    term = db.Column(db.String(20), nullable=False)
    level = db.Column(db.String(2), nullable=False)
    comment = db.Column(db.Text)
    teacher_id = db.Column(db.Integer, db.ForeignKey("users.id"))

    student = db.relationship("Student", back_populates="assessments")
    teacher = db.relationship("User")
