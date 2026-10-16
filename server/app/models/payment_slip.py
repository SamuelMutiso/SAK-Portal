from datetime import datetime, timezone

from app.extensions import db

SLIP_STATUSES = ("pending", "approved", "rejected")


class PaymentSlip(db.Model):
    __tablename__ = "payment_slips"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    submitted_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    amount = db.Column(db.Integer, nullable=False)
    bank_name = db.Column(db.String(60), nullable=False)
    reference = db.Column(db.String(60), nullable=False)
    paid_on = db.Column(db.Date, nullable=False)
    note = db.Column(db.String(200))
    file_name = db.Column(db.String(80), nullable=False)
    status = db.Column(db.String(10), nullable=False, default="pending")
    reviewed_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    reviewed_at = db.Column(db.DateTime)
    rejection_reason = db.Column(db.String(300))
    payment_id = db.Column(db.Integer, db.ForeignKey("payments.id"))
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    student = db.relationship("Student")
    submitted_by = db.relationship("User", foreign_keys=[submitted_by_id])
    reviewed_by = db.relationship("User", foreign_keys=[reviewed_by_id])
    payment = db.relationship("Payment")

    @property
    def audit_label(self):
        return f"Bank slip {self.reference}"
