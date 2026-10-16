from datetime import datetime

from app.extensions import db


class PaybillReceipt(db.Model):
    __tablename__ = "paybill_receipts"

    id = db.Column(db.Integer, primary_key=True)
    trans_id = db.Column(db.String(30), unique=True, nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    phone = db.Column(db.String(20))
    payer_name = db.Column(db.String(120))
    account = db.Column(db.String(40))
    received_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    payment_id = db.Column(db.Integer, db.ForeignKey("payments.id", name="fk_paybill_receipts_payment_id_payments"))
    assigned_by_id = db.Column(db.Integer, db.ForeignKey("users.id", name="fk_paybill_receipts_assigned_by_id_users"))
    assigned_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    payment = db.relationship("Payment")
    assigned_by = db.relationship("User")

    @property
    def audit_label(self):
        return f"Paybill {self.trans_id} (KES {self.amount:,})"
