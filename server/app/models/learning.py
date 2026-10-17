from datetime import datetime

from sqlalchemy.orm import deferred

from app.extensions import db

KINDS = ("notes", "file", "link", "video")


class LearningMaterial(db.Model):
    __tablename__ = "learning_materials"

    id = db.Column(db.Integer, primary_key=True)
    classroom_id = db.Column(db.Integer, db.ForeignKey("classrooms.id"), nullable=False)
    subject = db.Column(db.String(60), nullable=False)
    topic = db.Column(db.String(120))
    title = db.Column(db.String(150), nullable=False)
    kind = db.Column(db.String(10), nullable=False, default="notes")
    body = db.Column(db.Text)
    link_url = db.Column(db.String(500))
    file_name = db.Column(db.String(150))
    file_type = db.Column(db.String(40))
    file_size = db.Column(db.Integer)
    file_data = deferred(db.Column(db.LargeBinary))
    teacher_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    classroom = db.relationship("Classroom")
    teacher = db.relationship("User")

    @property
    def audit_label(self):
        return f"Learning material: {self.title}"
