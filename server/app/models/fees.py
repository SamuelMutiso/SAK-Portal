from datetime import datetime, timezone

from app.extensions import db

CATEGORIES = ("tuition", "boarding", "meals", "transport", "activity", "exam", "other")
LEARNER_TYPES = ("all", "day", "boarder")
INVOICE_STATUSES = ("unpaid", "partial", "paid", "cancelled")

student_discounts = db.Table(
    "student_discounts",
    db.Column("student_id", db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), primary_key=True),
    db.Column("discount_id", db.Integer, db.ForeignKey("discounts.id", ondelete="CASCADE"), primary_key=True),
)


def now():
    return datetime.now(timezone.utc)


class FeeItem(db.Model):
    __tablename__ = "fee_items"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    category = db.Column(db.String(20), nullable=False, default="other")
    description = db.Column(db.String(200))
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    sort_order = db.Column(db.Integer, default=0, nullable=False)

    rates = db.relationship("FeeRate", back_populates="item", cascade="all, delete-orphan")

    @property
    def audit_label(self):
        return self.name


class FeeRate(db.Model):
    __tablename__ = "fee_rates"

    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey("fee_items.id", ondelete="CASCADE"), nullable=False)
    term = db.Column(db.String(20), nullable=False)
    classroom_id = db.Column(db.Integer, db.ForeignKey("classrooms.id"))
    learner_type = db.Column(db.String(10), nullable=False, default="all")
    transport_route_id = db.Column(db.Integer, db.ForeignKey("transport_routes.id"))
    amount = db.Column(db.Integer, nullable=False)

    item = db.relationship("FeeItem", back_populates="rates")
    classroom = db.relationship("Classroom")
    transport_route = db.relationship("TransportRoute")

    @property
    def audit_label(self):
        item = self.item or db.session.get(FeeItem, self.item_id)
        return f"{item.name if item else 'Fee'} rate for {self.term}"


class Discount(db.Model):
    __tablename__ = "discounts"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    kind = db.Column(db.String(10), nullable=False, default="percent")
    value = db.Column(db.Integer, nullable=False)
    applies_to = db.Column(db.String(20), nullable=False, default="tuition")
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    students = db.relationship("Student", secondary=student_discounts, back_populates="discounts")

    @property
    def audit_label(self):
        return self.name


class Invoice(db.Model):
    __tablename__ = "invoices"

    id = db.Column(db.Integer, primary_key=True)
    number = db.Column(db.String(20), unique=True, nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    term = db.Column(db.String(20), nullable=False)
    issued_on = db.Column(db.Date, nullable=False)
    due_date = db.Column(db.Date)
    status = db.Column(db.String(10), nullable=False, default="unpaid")
    paid_amount = db.Column(db.Integer, nullable=False, default=0)
    note = db.Column(db.String(200))
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    cancelled_reason = db.Column(db.String(300))
    cancelled_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    cancelled_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, nullable=False, default=now)

    student = db.relationship("Student", back_populates="invoices")
    lines = db.relationship("InvoiceLine", back_populates="invoice", cascade="all, delete-orphan", order_by="InvoiceLine.id")
    created_by = db.relationship("User", foreign_keys=[created_by_id])
    cancelled_by = db.relationship("User", foreign_keys=[cancelled_by_id])

    @property
    def total(self):
        return sum(line.amount for line in self.lines)

    @property
    def balance(self):
        return 0 if self.status == "cancelled" else self.total - self.paid_amount

    @property
    def audit_label(self):
        return f"Invoice {self.number}"


class InvoiceLine(db.Model):
    __tablename__ = "invoice_lines"

    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey("fee_items.id"))
    description = db.Column(db.String(120), nullable=False)
    category = db.Column(db.String(20))
    amount = db.Column(db.Integer, nullable=False)

    invoice = db.relationship("Invoice", back_populates="lines")

    @property
    def audit_label(self):
        return self.description
