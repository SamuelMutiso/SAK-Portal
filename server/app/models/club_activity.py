from app.extensions import db


class ClubActivity(db.Model):
    __tablename__ = "club_activities"

    id = db.Column(db.Integer, primary_key=True)
    club_id = db.Column(db.Integer, db.ForeignKey("clubs.id"), nullable=False)
    date = db.Column(db.Date, nullable=False)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)

    club = db.relationship("Club", back_populates="activities")
