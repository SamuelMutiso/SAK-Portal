from app.extensions import db

STATUSES = ("active", "completed", "transferred", "withdrawn")


class Student(db.Model):
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    admission_number = db.Column(db.String(20), unique=True, nullable=False)
    upi = db.Column(db.String(20))
    assessment_number = db.Column(db.String(20))
    first_name = db.Column(db.String(60), nullable=False)
    last_name = db.Column(db.String(60), nullable=False)
    gender = db.Column(db.String(10))
    date_of_birth = db.Column(db.Date)
    is_boarder = db.Column(db.Boolean, default=False)
    fee_balance = db.Column(db.Integer, default=0)
    emergency_contact_name = db.Column(db.String(120))
    emergency_contact_phone = db.Column(db.String(20))
    classroom_id = db.Column(db.Integer, db.ForeignKey("classrooms.id"))
    parent_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    transport_route_id = db.Column(db.Integer, db.ForeignKey("transport_routes.id"))
    status = db.Column(db.String(20), nullable=False, default="active", server_default="active")
    admission_date = db.Column(db.Date)
    left_on = db.Column(db.Date)
    leaving_reason = db.Column(db.String(300))
    last_classroom_name = db.Column(db.String(40))
    home_address = db.Column(db.String(200))
    previous_school = db.Column(db.String(120))
    guardian_relationship = db.Column(db.String(30))
    guardian2_name = db.Column(db.String(120))
    guardian2_phone = db.Column(db.String(20))
    guardian2_relationship = db.Column(db.String(30))
    allergies = db.Column(db.String(300))
    medical_conditions = db.Column(db.String(300))

    classroom = db.relationship("Classroom", back_populates="students")
    parent = db.relationship("User", back_populates="children")
    transport_route = db.relationship("TransportRoute", back_populates="students")
    clubs = db.relationship("Club", secondary="club_members", back_populates="students")
    attendance = db.relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    assessments = db.relationship("Assessment", back_populates="student", cascade="all, delete-orphan")
    pickups = db.relationship("AuthorizedPickup", back_populates="student", cascade="all, delete-orphan")
    payments = db.relationship("Payment", back_populates="student", cascade="all, delete-orphan")
    invoices = db.relationship("Invoice", back_populates="student", order_by="Invoice.issued_on, Invoice.id")
    discounts = db.relationship("Discount", secondary="student_discounts", back_populates="students")
    history = db.relationship("StudentHistory", back_populates="student", cascade="all, delete-orphan", order_by="StudentHistory.year.desc(), StudentHistory.id.desc()")

    @property
    def audit_label(self):
        return f"{self.first_name} {self.last_name} ({self.admission_number})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
