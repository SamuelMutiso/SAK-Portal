from datetime import datetime

from app.extensions import db


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), index=True)
    user_name = db.Column(db.String(120))
    user_role = db.Column(db.String(20))
    kind = db.Column(db.String(20), nullable=False, index=True)
    action = db.Column(db.String(150), nullable=False)
    method = db.Column(db.String(10))
    path = db.Column(db.String(255))
    status = db.Column(db.Integer)
    changes = db.Column(db.JSON, default=list)
    ip_address = db.Column(db.String(64))
    user_agent = db.Column(db.String(400))
    device = db.Column(db.String(120))
    previous_hash = db.Column(db.String(64))
    entry_hash = db.Column(db.String(64), nullable=False)
