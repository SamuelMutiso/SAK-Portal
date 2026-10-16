from datetime import datetime

from app.extensions import db

STATUSES = ("pending", "completed", "failed", "reversed")
METHODS = ("M-Pesa", "Paybill", "Bank", "Cash", "Cheque")


class Payment(db.Model):
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    phone = db.Column(db.String(20))
    status = db.Column(db.String(10), nullable=False, default="pending")
    receipt = db.Column(db.String(40))
    checkout_id = db.Column(db.String(80), unique=True)
    method = db.Column(db.String(20), default="M-Pesa")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    receipt_number = db.Column(db.String(20))
    reference = db.Column(db.String(60))
    bank_name = db.Column(db.String(60))
    note = db.Column(db.String(200))
    paid_on = db.Column(db.Date)
    recorded_by_id = db.Column(db.Integer, db.ForeignKey("users.id", name="fk_payments_recorded_by_id_users"))
    reversed_reason = db.Column(db.String(300))
    reversed_by_id = db.Column(db.Integer, db.ForeignKey("users.id", name="fk_payments_reversed_by_id_users"))
    reversed_at = db.Column(db.DateTime)

    __table_args__ = (db.UniqueConstraint("receipt_number", name="uq_payments_receipt_number"),)

    student = db.relationship("Student", back_populates="payments")
    recorded_by = db.relationship("User", foreign_keys=[recorded_by_id])
    reversed_by = db.relationship("User", foreign_keys=[reversed_by_id])

    @property
    def audit_label(self):
        from app.models.student import Student

        student = self.student or db.session.get(Student, self.student_id)
        name = student.full_name if student else f"learner #{self.student_id}"
        return f"KES {self.amount:,} for {name}"
