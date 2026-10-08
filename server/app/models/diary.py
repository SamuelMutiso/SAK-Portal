from app.extensions import db

MOODS = ("happy", "calm", "tired", "upset")


class DiaryEntry(db.Model):
    __tablename__ = "diary_entries"
    __table_args__ = (db.UniqueConstraint("student_id", "date"),)

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    date = db.Column(db.Date, nullable=False)
    meals = db.Column(db.String(120))
    nap = db.Column(db.String(60))
    mood = db.Column(db.String(10), default="happy")
    activities = db.Column(db.Text)
    note = db.Column(db.Text)
    teacher_id = db.Column(db.Integer, db.ForeignKey("users.id"))

    student = db.relationship("Student")
