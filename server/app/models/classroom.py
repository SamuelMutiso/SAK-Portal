from app.extensions import db


class Classroom(db.Model):
    __tablename__ = "classrooms"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(40), nullable=False)
    level = db.Column(db.String(40), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey("users.id"))

    teacher = db.relationship("User", back_populates="classroom")
    students = db.relationship("Student", back_populates="classroom")
    homework = db.relationship("Homework", back_populates="classroom", cascade="all, delete-orphan")
