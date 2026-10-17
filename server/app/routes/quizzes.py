from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.curriculum import LEARNING_AREAS
from app.extensions import db, limiter
from app.models import Classroom, Quiz, QuizAttempt, QuizQuestion
from app.schemas.quiz import QuizSchema, StartSchema, SubmitSchema
from app.services.quizzes import attempt_summary, deadline, mark, percent, question_for_taker, review
from app.utils.roles import current_user, roles_required, viewable_student

quizzes_bp = Blueprint("quizzes", __name__, url_prefix="/api")
READERS = ("admin", "director", "exams")


def can_manage(user, quiz=None, classroom_id=None, purpose=None):
    purpose = quiz.purpose if quiz else purpose
    classroom_id = quiz.classroom_id if quiz else classroom_id
    if purpose == "placement":
        return user.role == "admin"
    if user.role == "admin":
        return True
    return user.role == "teacher" and user.classroom is not None and user.classroom.id == classroom_id


def can_read(user, quiz):
    return user.role in READERS or can_manage(user, quiz)


def summary(quiz, include_counts=True):
    data = {
        "id": quiz.id,
        "classroom_id": quiz.classroom_id,
        "classroom_name": quiz.classroom.name if quiz.classroom else None,
        "purpose": quiz.purpose,
        "subject": quiz.subject,
        "topic": quiz.topic,
        "title": quiz.title,
        "instructions": quiz.instructions,
        "time_limit": quiz.time_limit,
        "is_published": quiz.is_published,
        "question_count": len(quiz.questions),
        "total_points": sum(question.points for question in quiz.questions),
        "teacher_id": quiz.teacher_id,
        "teacher_name": quiz.teacher.full_name if quiz.teacher else None,
        "created_at": quiz.created_at.isoformat(),
    }
    if include_counts:
        done = [attempt for attempt in quiz.attempts if attempt.submitted_at]
        data["attempt_count"] = len(done)
        data["learners_done"] = len({attempt.student_id or attempt.candidate_name for attempt in done})
        data["average"] = round(sum(percent(attempt) for attempt in done) / len(done)) if done else None
    return data


def full(quiz):
    return {**summary(quiz), "questions": [
        {"id": question.id, "kind": question.kind, "prompt": question.prompt, "options": question.options, "answer": question.answer,
         "explanation": question.explanation, "points": question.points} for question in quiz.questions]}


def latest_attempts(quiz, student_id):
    return sorted((attempt for attempt in quiz.attempts if attempt.student_id == student_id and attempt.submitted_at), key=lambda attempt: attempt.submitted_at)


@quizzes_bp.get("/quizzes")
@jwt_required()
def list_quizzes():
    user = current_user()
    student_id = request.args.get("student_id", type=int)
    if user.role == "parent" and not student_id:
        return jsonify([])
    if student_id:
        student = viewable_student(student_id)
        if user.role != "parent" and user.role not in READERS and not (user.role == "teacher" and user.classroom and user.classroom.id == student.classroom_id):
            return jsonify(error="You do not have access to this"), 403
        quizzes = Quiz.query.filter_by(classroom_id=student.classroom_id, purpose="practice", is_published=True).order_by(Quiz.created_at.desc()).all() if student.classroom_id else []
        data = []
        for quiz in quizzes:
            done = latest_attempts(quiz, student.id)
            item = summary(quiz, include_counts=False)
            item["my_attempts"] = len(done)
            item["my_latest"] = attempt_summary(done[-1]) if done else None
            item["my_best"] = max((percent(attempt) for attempt in done), default=None)
            data.append(item)
        return jsonify(data)
    if user.role not in READERS + ("teacher",):
        return jsonify(error="You do not have access to this"), 403
    purpose = request.args.get("purpose", "practice")
    query = Quiz.query.filter_by(purpose=purpose)
    if user.role == "teacher":
        if purpose == "placement" or not user.classroom:
            return jsonify([])
        query = query.filter_by(classroom_id=user.classroom.id)
    elif request.args.get("classroom_id", type=int):
        query = query.filter_by(classroom_id=request.args.get("classroom_id", type=int))
    return jsonify([summary(quiz) for quiz in query.order_by(Quiz.created_at.desc()).limit(200).all()])


def build(quiz, data, classroom):
    if data["subject"] not in LEARNING_AREAS.get(classroom.level, []) and not (data["purpose"] == "placement" and data["subject"] == "General"):
        return f"{data['subject']} is not a learning area for {classroom.name}"
    for field in ("classroom_id", "purpose", "subject", "topic", "title", "instructions", "time_limit", "is_published"):
        setattr(quiz, field, data[field])
    quiz.questions = [QuizQuestion(position=index, **question) for index, question in enumerate(data["questions"])]
    return None


@quizzes_bp.post("/quizzes")
@limiter.limit("60 per hour")
@roles_required("admin", "teacher")
def create_quiz():
    user = current_user()
    data = QuizSchema().load(request.get_json() or {})
    classroom = db.get_or_404(Classroom, data["classroom_id"])
    if not can_manage(user, classroom_id=classroom.id, purpose=data["purpose"]):
        return jsonify(error="You can only create quizzes for your own class"), 403
    quiz = Quiz(teacher_id=user.id)
    problem = build(quiz, data, classroom)
    if problem:
        return jsonify(error=problem), 400
    db.session.add(quiz)
    db.session.commit()
    return jsonify(full(quiz)), 201


@quizzes_bp.get("/quizzes/<int:quiz_id>")
@jwt_required()
def get_quiz(quiz_id):
    quiz = db.get_or_404(Quiz, quiz_id)
    if not can_read(current_user(), quiz):
        return jsonify(error="You do not have access to this"), 403
    return jsonify(full(quiz))


@quizzes_bp.put("/quizzes/<int:quiz_id>")
@roles_required("admin", "teacher")
def update_quiz(quiz_id):
    user = current_user()
    quiz = db.get_or_404(Quiz, quiz_id)
    if not can_manage(user, quiz):
        return jsonify(error="You can only edit your own class quizzes"), 403
    data = QuizSchema().load(request.get_json() or {})
    if data["purpose"] != quiz.purpose or data["classroom_id"] != quiz.classroom_id:
        return jsonify(error="The class and type of a quiz cannot be changed"), 400
    if quiz.attempts:
        quiz.is_published = data["is_published"]
        quiz.title = data["title"]
        quiz.instructions = data["instructions"]
        quiz.time_limit = data["time_limit"]
        db.session.commit()
        return jsonify({**full(quiz), "note": "Learners have already taken this quiz, so only the title, instructions, time limit and publishing were changed."})
    problem = build(quiz, data, quiz.classroom)
    if problem:
        return jsonify(error=problem), 400
    db.session.commit()
    return jsonify(full(quiz))


@quizzes_bp.delete("/quizzes/<int:quiz_id>")
@roles_required("admin", "teacher")
def delete_quiz(quiz_id):
    quiz = db.get_or_404(Quiz, quiz_id)
    if not can_manage(current_user(), quiz):
        return jsonify(error="You can only delete your own class quizzes"), 403
    db.session.delete(quiz)
    db.session.commit()
    return "", 204


@quizzes_bp.get("/quizzes/<int:quiz_id>/results")
@jwt_required()
def results(quiz_id):
    quiz = db.get_or_404(Quiz, quiz_id)
    if not can_read(current_user(), quiz):
        return jsonify(error="You do not have access to this"), 403
    done = sorted((attempt for attempt in quiz.attempts if attempt.submitted_at), key=lambda attempt: attempt.submitted_at)
    latest = {}
    counts = {}
    for attempt in done:
        key = attempt.student_id or f"candidate:{attempt.id}"
        latest[key] = attempt
        counts[key] = counts.get(key, 0) + 1
    rows = [{**attempt_summary(attempt), "attempts": counts[key]} for key, attempt in latest.items()]
    rows.sort(key=lambda row: -(row["percent"] or 0))
    questions = []
    for question in quiz.questions:
        answered = [attempt for attempt in latest.values()]
        right = sum(1 for attempt in answered if any(item["id"] == question.id and item["correct"] for item in review_cache(attempt)))
        questions.append({"id": question.id, "prompt": question.prompt, "percent_right": round(right / len(answered) * 100) if answered else None})
    waiting = []
    if quiz.purpose == "practice" and quiz.classroom:
        taken = {attempt.student_id for attempt in done}
        waiting = [student.full_name for student in quiz.classroom.students if student.status == "active" and student.id not in taken]
    return jsonify(
        quiz=summary(quiz),
        learners=rows,
        average=round(sum(row["percent"] for row in rows) / len(rows)) if rows else None,
        hardest=sorted((item for item in questions if item["percent_right"] is not None), key=lambda item: item["percent_right"])[:3],
        questions=questions,
        not_yet=sorted(waiting),
    )


def review_cache(attempt):
    if not hasattr(attempt, "_review"):
        attempt._review = review(attempt)
    return attempt._review


@quizzes_bp.post("/quizzes/<int:quiz_id>/start")
@limiter.limit("60 per hour")
@roles_required("parent", "admin")
def start_attempt(quiz_id):
    user = current_user()
    quiz = db.get_or_404(Quiz, quiz_id)
    data = StartSchema().load(request.get_json() or {})
    attempt = QuizAttempt(quiz_id=quiz.id, taken_by_id=user.id)
    if quiz.purpose == "placement":
        if user.role != "admin":
            return jsonify(error="Placement tests are given by the school office"), 403
        if not data.get("candidate_name"):
            return jsonify(error="Enter the applicant's full name"), 400
        attempt.candidate_name = data["candidate_name"].strip()
        attempt.candidate_phone = data.get("candidate_phone")
    else:
        if user.role != "parent":
            return jsonify(error="Practice quizzes are taken from the parent's account"), 403
        student = viewable_student(data.get("student_id") or 0)
        if not quiz.is_published or student.classroom_id != quiz.classroom_id or student.status != "active":
            return jsonify(error="This quiz is not open for this learner"), 403
        attempt.student_id = student.id
    db.session.add(attempt)
    db.session.commit()
    end = deadline(attempt)
    return jsonify(
        attempt_id=attempt.id,
        quiz={"id": quiz.id, "title": quiz.title, "subject": quiz.subject, "topic": quiz.topic, "instructions": quiz.instructions, "time_limit": quiz.time_limit},
        questions=[question_for_taker(question) for question in quiz.questions],
        ends_at=end.isoformat() + "Z" if end else None,
        seconds_left=quiz.time_limit * 60 if quiz.time_limit else None,
    ), 201


@quizzes_bp.post("/attempts/<int:attempt_id>/submit")
@limiter.limit("60 per hour")
@roles_required("parent", "admin")
def submit_attempt(attempt_id):
    user = current_user()
    attempt = db.get_or_404(QuizAttempt, attempt_id)
    if attempt.taken_by_id != user.id:
        return jsonify(error="You do not have access to this"), 403
    if attempt.submitted_at:
        return jsonify(error="This quiz has already been handed in"), 409
    data = SubmitSchema().load(request.get_json() or {})
    mark(attempt, data["answers"])
    db.session.commit()
    return jsonify(result=attempt_summary(attempt), review=review(attempt))


@quizzes_bp.get("/attempts/<int:attempt_id>")
@jwt_required()
def get_attempt(attempt_id):
    user = current_user()
    attempt = db.get_or_404(QuizAttempt, attempt_id)
    allowed = attempt.taken_by_id == user.id or can_read(user, attempt.quiz)
    if not allowed and attempt.student_id and user.role == "parent":
        allowed = attempt.student.parent_id == user.id
    if not allowed or not attempt.submitted_at:
        return jsonify(error="You do not have access to this"), 403
    return jsonify(quiz=summary(attempt.quiz, include_counts=False), result=attempt_summary(attempt), review=review(attempt))
