from app.extensions import db

STATUSES = ("present", "absent", "late")


class Attendance(db.Model):
    __tablename__ = "attendance"
    __table_args__ = (db.UniqueConstraint("student_id", "date"),)

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(10), nullable=False, default="present")
    recorded_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))

    student = db.relationship("Student", back_populates="attendance")
