from datetime import datetime

from app.extensions import db

TRIP_EVENTS = ("boarded", "dropped")


class TransportLog(db.Model):
    __tablename__ = "transport_logs"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    route_id = db.Column(db.Integer, db.ForeignKey("transport_routes.id"), nullable=False)
    event = db.Column(db.String(10), nullable=False)
    recorded_at = db.Column(db.DateTime, default=datetime.utcnow)
    driver_id = db.Column(db.Integer, db.ForeignKey("users.id"))

    student = db.relationship("Student")
