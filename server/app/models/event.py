from app.extensions import db

CATEGORIES = ("academic", "sports", "club", "trip", "holiday", "meeting")


class Event(db.Model):
    __tablename__ = "events"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(20), default="academic")
    location = db.Column(db.String(120))
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date)
