from datetime import datetime

from app.extensions import db


class Consent(db.Model):
    __tablename__ = "consents"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    version = db.Column(db.String(20), nullable=False)
    accepted_terms = db.Column(db.Boolean, nullable=False, default=False)
    accepted_privacy = db.Column(db.Boolean, nullable=False, default=False)
    child_data = db.Column(db.Boolean)
    photo_consent = db.Column(db.Boolean)
    signature = db.Column(db.String(120), nullable=False)
    ip_address = db.Column(db.String(64))
    user_agent = db.Column(db.String(400))
    accepted_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship("User")

    @property
    def audit_label(self):
        return f"Policy consent ({self.version}) signed as {self.signature}"
