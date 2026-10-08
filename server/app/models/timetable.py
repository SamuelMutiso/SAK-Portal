from app.extensions import db


class TimetableSlot(db.Model):
    __tablename__ = "timetable_slots"
    __table_args__ = (db.UniqueConstraint("classroom_id", "day", "period"),)

    id = db.Column(db.Integer, primary_key=True)
    classroom_id = db.Column(db.Integer, db.ForeignKey("classrooms.id"), nullable=False)
    day = db.Column(db.Integer, nullable=False)
    period = db.Column(db.Integer, nullable=False)
    subject = db.Column(db.String(60), nullable=False)

    classroom = db.relationship("Classroom")
