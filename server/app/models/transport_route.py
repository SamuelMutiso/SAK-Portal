from app.extensions import db


class TransportRoute(db.Model):
    __tablename__ = "transport_routes"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    driver_name = db.Column(db.String(120))
    driver_phone = db.Column(db.String(20))
    vehicle = db.Column(db.String(40))
    stops = db.Column(db.JSON, default=list)
    driver_id = db.Column(db.Integer, db.ForeignKey("users.id"))

    driver = db.relationship("User")

    students = db.relationship("Student", back_populates="transport_route")
