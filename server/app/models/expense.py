from datetime import datetime

from sqlalchemy.orm import deferred

from app.extensions import db

CATEGORIES = (
    "Fuel & transport",
    "Food & kitchen",
    "Salaries & wages",
    "Repairs & maintenance",
    "Books & stationery",
    "Water, power & internet",
    "Cleaning & hygiene",
    "Medical & first aid",
    "Events & trips",
    "Other",
)
METHODS = ("Cash", "M-Pesa", "Bank", "Cheque")


class Expense(db.Model):
    __tablename__ = "expenses"

    id = db.Column(db.Integer, primary_key=True)
    spent_on = db.Column(db.Date, nullable=False)
    category = db.Column(db.String(40), nullable=False)
    description = db.Column(db.String(200), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    paid_to = db.Column(db.String(120), nullable=False)
    method = db.Column(db.String(10), nullable=False, default="Cash")
    reference = db.Column(db.String(60))
    receipt_name = db.Column(db.String(150))
    receipt_type = db.Column(db.String(40))
    receipt_data = deferred(db.Column(db.LargeBinary))
    recorded_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    voided_at = db.Column(db.DateTime)
    voided_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    void_reason = db.Column(db.String(300))

    recorded_by = db.relationship("User", foreign_keys=[recorded_by_id])
    voided_by = db.relationship("User", foreign_keys=[voided_by_id])

    @property
    def audit_label(self):
        return f"Expense KES {self.amount:,}: {self.description}"
