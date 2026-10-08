from app.extensions import db


class AuthorizedPickup(db.Model):
    __tablename__ = "authorized_pickups"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    full_name = db.Column(db.String(120), nullable=False)
    relationship = db.Column(db.String(40), nullable=False)
    phone = db.Column(db.String(20), nullable=False)

    student = db.relationship("Student", back_populates="pickups")

    @property
    def audit_label(self):
        return f"{self.full_name} ({self.relationship})"
