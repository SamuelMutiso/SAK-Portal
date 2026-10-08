from datetime import datetime

from app.extensions import db

ITEM_TYPES = ("notice", "homework", "report")


class Acknowledgement(db.Model):
    __tablename__ = "acknowledgements"
    __table_args__ = (db.UniqueConstraint("user_id", "item_type", "item_id"),)

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    item_type = db.Column(db.String(20), nullable=False)
    item_id = db.Column(db.Integer, nullable=False)
    seen_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User")
