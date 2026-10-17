from datetime import datetime

from app.extensions import db

PURPOSES = ("practice", "placement")
QUESTION_KINDS = ("choice", "short")


class Quiz(db.Model):
    __tablename__ = "quizzes"

    id = db.Column(db.Integer, primary_key=True)
    classroom_id = db.Column(db.Integer, db.ForeignKey("classrooms.id"), nullable=False)
    purpose = db.Column(db.String(10), nullable=False, default="practice")
    subject = db.Column(db.String(60), nullable=False)
    topic = db.Column(db.String(120))
    title = db.Column(db.String(150), nullable=False)
    instructions = db.Column(db.Text)
    time_limit = db.Column(db.Integer)
    is_published = db.Column(db.Boolean, nullable=False, default=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    classroom = db.relationship("Classroom")
    teacher = db.relationship("User")
    questions = db.relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan", order_by="QuizQuestion.position")
    attempts = db.relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")

    @property
    def audit_label(self):
        return f"Quiz: {self.title}"


class QuizQuestion(db.Model):
    __tablename__ = "quiz_questions"

    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    position = db.Column(db.Integer, nullable=False, default=0)
    kind = db.Column(db.String(10), nullable=False, default="choice")
    prompt = db.Column(db.Text, nullable=False)
    options = db.Column(db.JSON)
    answer = db.Column(db.String(500), nullable=False)
    explanation = db.Column(db.Text)
    points = db.Column(db.Integer, nullable=False, default=1)

    quiz = db.relationship("Quiz", back_populates="questions")

    @property
    def audit_label(self):
        return f"Quiz question {self.position + 1}"


class QuizAttempt(db.Model):
    __tablename__ = "quiz_attempts"

    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"))
    candidate_name = db.Column(db.String(120))
    candidate_phone = db.Column(db.String(20))
    taken_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    answers = db.Column(db.JSON)
    score = db.Column(db.Integer)
    total = db.Column(db.Integer)
    late = db.Column(db.Boolean, nullable=False, default=False)
    started_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    submitted_at = db.Column(db.DateTime)

    quiz = db.relationship("Quiz", back_populates="attempts")
    student = db.relationship("Student")
    taken_by = db.relationship("User")

    @property
    def audit_label(self):
        who = self.student.full_name if self.student else self.candidate_name or "learner"
        return f"Quiz attempt by {who}"
