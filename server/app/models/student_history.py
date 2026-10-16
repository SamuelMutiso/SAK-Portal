from datetime import datetime, timezone

from app.extensions import db

OUTCOMES = ("admitted", "promoted", "repeated", "completed", "transferred", "withdrawn", "readmitted")


class StudentHistory(db.Model):
    __tablename__ = "student_history"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    classroom_name = db.Column(db.String(40))
    outcome = db.Column(db.String(20), nullable=False)
    note = db.Column(db.String(300))
    recorded_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    student = db.relationship("Student", back_populates="history")
    recorded_by = db.relationship("User")

    @property
    def audit_label(self):
        from app.models.student import Student

        student = self.student or db.session.get(Student, self.student_id)
        return f"{student.full_name if student else 'Learner'}: {self.outcome} {self.year}"
