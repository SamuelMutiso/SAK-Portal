from app.extensions import db


class Student(db.Model):
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    admission_number = db.Column(db.String(20), unique=True, nullable=False)
    first_name = db.Column(db.String(60), nullable=False)
    last_name = db.Column(db.String(60), nullable=False)
    gender = db.Column(db.String(10))
    date_of_birth = db.Column(db.Date)
    is_boarder = db.Column(db.Boolean, default=False)
    classroom_id = db.Column(db.Integer, db.ForeignKey("classrooms.id"))
    parent_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    transport_route_id = db.Column(db.Integer, db.ForeignKey("transport_routes.id"))

    classroom = db.relationship("Classroom", back_populates="students")
    parent = db.relationship("User", back_populates="children")
    transport_route = db.relationship("TransportRoute", back_populates="students")
    clubs = db.relationship("Club", secondary="club_members", back_populates="students")
    attendance = db.relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    assessments = db.relationship("Assessment", back_populates="student", cascade="all, delete-orphan")

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
