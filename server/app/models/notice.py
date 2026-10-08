from datetime import datetime

from app.extensions import db

AUDIENCES = ("all", "class", "club", "route", "boarders")


class Notice(db.Model):
    __tablename__ = "notices"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    body = db.Column(db.Text, nullable=False)
    audience = db.Column(db.String(20), nullable=False, default="all")
    classroom_id = db.Column(db.Integer, db.ForeignKey("classrooms.id"))
    club_id = db.Column(db.Integer, db.ForeignKey("clubs.id"))
    transport_route_id = db.Column(db.Integer, db.ForeignKey("transport_routes.id"))
    send_sms = db.Column(db.Boolean, default=False)
    sms_count = db.Column(db.Integer, default=0)
    author_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    author = db.relationship("User")
    classroom = db.relationship("Classroom")
    club = db.relationship("Club")
    transport_route = db.relationship("TransportRoute")
