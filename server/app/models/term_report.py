from datetime import datetime

from app.extensions import db


class TermReport(db.Model):
    __tablename__ = "term_reports"
    __table_args__ = (db.UniqueConstraint("student_id", "term"),)

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    term = db.Column(db.String(20), nullable=False)
    competencies = db.Column(db.JSON, default=dict)
    values = db.Column(db.JSON, default=dict)
    co_curricular = db.Column(db.Text)
    teacher_comment = db.Column(db.Text)
    head_comment = db.Column(db.Text)
    closing_date = db.Column(db.Date)
    opening_date = db.Column(db.Date)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = db.relationship("Student")
