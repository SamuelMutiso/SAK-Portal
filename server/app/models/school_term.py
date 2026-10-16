from app.extensions import db


class SchoolTerm(db.Model):
    __tablename__ = "school_terms"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(20), unique=True, nullable=False)
    year = db.Column(db.Integer, nullable=False)
    number = db.Column(db.Integer, nullable=False)
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    fee_due_date = db.Column(db.Date)
    is_current = db.Column(db.Boolean, default=False, nullable=False)

    @property
    def audit_label(self):
        return self.name
