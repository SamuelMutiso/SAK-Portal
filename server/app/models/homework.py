from datetime import datetime

from app.extensions import db


class Homework(db.Model):
    __tablename__ = "homework"

    id = db.Column(db.Integer, primary_key=True)
    classroom_id = db.Column(db.Integer, db.ForeignKey("classrooms.id"), nullable=False)
    subject = db.Column(db.String(60), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    details = db.Column(db.Text)
    due_date = db.Column(db.Date, nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    classroom = db.relationship("Classroom", back_populates="homework")
    teacher = db.relationship("User")

    @property
    def audit_label(self):
        return f"Homework: {self.title}"
