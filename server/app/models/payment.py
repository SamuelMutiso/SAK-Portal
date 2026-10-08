from datetime import datetime

from app.extensions import db

STATUSES = ("pending", "completed", "failed")


class Payment(db.Model):
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(10), nullable=False, default="pending")
    receipt = db.Column(db.String(40))
    checkout_id = db.Column(db.String(80), unique=True)
    method = db.Column(db.String(20), default="M-Pesa")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    student = db.relationship("Student", back_populates="payments")

    @property
    def audit_label(self):
        from app.models.student import Student

        student = self.student or db.session.get(Student, self.student_id)
        name = student.full_name if student else f"learner #{self.student_id}"
        return f"KES {self.amount:,} for {name}"
