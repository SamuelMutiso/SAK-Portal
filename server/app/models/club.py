from app.extensions import db

club_members = db.Table(
    "club_members",
    db.Column("club_id", db.Integer, db.ForeignKey("clubs.id"), primary_key=True),
    db.Column("student_id", db.Integer, db.ForeignKey("students.id"), primary_key=True),
)


class Club(db.Model):
    __tablename__ = "clubs"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    description = db.Column(db.Text)
    meeting_day = db.Column(db.String(20))
    venue = db.Column(db.String(80))
    patron_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    leader_id = db.Column(db.Integer, db.ForeignKey("students.id", use_alter=True, name="fk_clubs_leader_id_students"))

    patron = db.relationship("User")
    leader = db.relationship("Student", foreign_keys=[leader_id])
    students = db.relationship("Student", secondary=club_members, back_populates="clubs")
    activities = db.relationship("ClubActivity", back_populates="club", cascade="all, delete-orphan", order_by="ClubActivity.date.desc()")
