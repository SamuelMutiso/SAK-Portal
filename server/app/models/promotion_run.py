from datetime import datetime, timezone

from app.extensions import db


class PromotionRun(db.Model):
    __tablename__ = "promotion_runs"

    id = db.Column(db.Integer, primary_key=True)
    from_year = db.Column(db.Integer, unique=True, nullable=False)
    to_year = db.Column(db.Integer, nullable=False)
    promoted = db.Column(db.Integer, default=0)
    repeated = db.Column(db.Integer, default=0)
    completed = db.Column(db.Integer, default=0)
    run_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    run_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    run_by = db.relationship("User")

    @property
    def audit_label(self):
        return f"Promotion {self.from_year} to {self.to_year}"
