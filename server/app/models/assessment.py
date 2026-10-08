from app.extensions import db

LEVELS = ("EE", "ME", "AE", "BE")
EXAMS = ("Opener", "Mid-Term", "End-Term")


def level_for(score):
    if score >= 75:
        return "EE"
    if score >= 50:
        return "ME"
    if score >= 25:
        return "AE"
    return "BE"


class Assessment(db.Model):
    __tablename__ = "assessments"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    subject = db.Column(db.String(60), nullable=False)
    term = db.Column(db.String(20), nullable=False)
    exam = db.Column(db.String(20), nullable=False, default="End-Term")
    score = db.Column(db.Integer)
    level = db.Column(db.String(2), nullable=False)
    comment = db.Column(db.Text)
    teacher_id = db.Column(db.Integer, db.ForeignKey("users.id"))

    student = db.relationship("Student", back_populates="assessments")
    teacher = db.relationship("User")

    @property
    def audit_label(self):
        from app.models.student import Student

        student = self.student or db.session.get(Student, self.student_id)
        name = student.full_name if student else f"learner #{self.student_id}"
        return f"{name}: {self.subject}, {self.term} {self.exam}"
