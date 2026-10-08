from datetime import datetime, timezone

from app.extensions import db


class MarkChange(db.Model):
    __tablename__ = "mark_changes"

    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    old_score = db.Column(db.Integer)
    old_level = db.Column(db.String(2))
    new_score = db.Column(db.Integer)
    new_level = db.Column(db.String(2))
    reason = db.Column(db.String(300), nullable=False)
    changed_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    changed_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    assessment = db.relationship("Assessment", back_populates="changes")
    changed_by = db.relationship("User")

    @property
    def audit_label(self):
        from app.models.assessment import Assessment

        assessment = self.assessment or db.session.get(Assessment, self.assessment_id)
        return f"Mark change for {assessment.audit_label}" if assessment else "Mark change"
