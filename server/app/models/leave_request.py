from datetime import datetime

from app.extensions import db

STATUSES = ("pending", "approved", "declined")


class LeaveRequest(db.Model):
    __tablename__ = "leave_requests"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    leave_date = db.Column(db.Date, nullable=False)
    return_date = db.Column(db.Date, nullable=False)
    reason = db.Column(db.Text, nullable=False)
    picked_by = db.Column(db.String(120), nullable=False)
    status = db.Column(db.String(10), nullable=False, default="pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    student = db.relationship("Student")
    parent = db.relationship("User")

    @property
    def audit_label(self):
        from app.models.student import Student

        student = self.student or db.session.get(Student, self.student_id)
        name = student.full_name if student else f"learner #{self.student_id}"
        return f"Leave-out for {name}"
