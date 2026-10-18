from datetime import datetime

from app.extensions import db


class StoredFile(db.Model):
    __tablename__ = "stored_files"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    content_type = db.Column(db.String(40), nullable=False)
    data = db.Column(db.LargeBinary, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    @property
    def audit_label(self):
        return "Uploaded file"
