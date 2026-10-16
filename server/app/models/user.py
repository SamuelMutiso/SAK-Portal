from datetime import datetime

from app.extensions import bcrypt, db

ROLES = ("superadmin", "director", "admin", "bursar", "exams", "teacher", "parent", "driver")
STAFF_ROLES = ("director", "admin", "bursar", "exams", "teacher", "driver")
ADMIN_LIKE = ("admin", "director")


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="parent")
    password_hash = db.Column(db.String(128), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    removed_at = db.Column(db.DateTime)
    photo_consent = db.Column(db.Boolean)
    must_change_password = db.Column(db.Boolean, nullable=False, default=False, server_default="0")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    children = db.relationship("Student", back_populates="parent")
    classroom = db.relationship("Classroom", back_populates="teacher", uselist=False)

    @property
    def audit_label(self):
        return f"{self.full_name} ({self.role})"

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)
