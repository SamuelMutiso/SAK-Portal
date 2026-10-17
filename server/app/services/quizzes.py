import re
from datetime import datetime, timedelta

GRACE = timedelta(seconds=90)


def tidy(text):
    text = re.sub(r"[^\w\s./-]", "", str(text or "").lower())
    return re.sub(r"\s+", " ", text).strip()


def number(text):
    try:
        return float(tidy(text).replace(" ", "").replace(",", ""))
    except ValueError:
        return None


def accepted(question):
    return [item.strip() for item in question.answer.split("\n") if item.strip()]


def is_right(question, given):
    if given is None or str(given).strip() == "":
        return False
    if question.kind == "choice":
        return str(given) == str(question.answer)
    for answer in accepted(question):
        if tidy(given) == tidy(answer):
            return True
        if number(given) is not None and number(given) == number(answer):
            return True
    return False


def right_answer_text(question):
    if question.kind == "choice":
        options = question.options or []
        index = int(question.answer) if str(question.answer).isdigit() else -1
        return options[index] if 0 <= index < len(options) else ""
    return accepted(question)[0] if accepted(question) else ""


def deadline(attempt):
    limit = attempt.quiz.time_limit
    return attempt.started_at + timedelta(minutes=limit) if limit else None


def mark(attempt, answers):
    score = total = 0
    clean = {}
    for question in attempt.quiz.questions:
        given = answers.get(str(question.id))
        given = None if given is None else str(given)[:300]
        clean[str(question.id)] = given
        total += question.points
        if is_right(question, given):
            score += question.points
    attempt.answers = clean
    attempt.score = score
    attempt.total = total
    attempt.submitted_at = datetime.utcnow()
    end = deadline(attempt)
    attempt.late = bool(end and attempt.submitted_at > end + GRACE)
    return attempt


def question_for_taker(question):
    return {"id": question.id, "kind": question.kind, "prompt": question.prompt, "options": question.options if question.kind == "choice" else None, "points": question.points}


def review(attempt):
    answers = attempt.answers or {}
    items = []
    for question in attempt.quiz.questions:
        given = answers.get(str(question.id))
        shown = given
        if question.kind == "choice" and given is not None and str(given).isdigit():
            options = question.options or []
            shown = options[int(given)] if int(given) < len(options) else given
        items.append({
            **question_for_taker(question),
            "given": shown,
            "correct": is_right(question, given),
            "right_answer": right_answer_text(question),
            "explanation": question.explanation,
        })
    return items


def percent(attempt):
    return round(attempt.score / attempt.total * 100) if attempt.total else 0


def level(value):
    if value >= 75:
        return "EE"
    if value >= 50:
        return "ME"
    if value >= 25:
        return "AE"
    return "BE"


def attempt_summary(attempt):
    return {
        "id": attempt.id,
        "quiz_id": attempt.quiz_id,
        "student_id": attempt.student_id,
        "name": attempt.student.full_name if attempt.student else attempt.candidate_name,
        "candidate_phone": attempt.candidate_phone,
        "score": attempt.score,
        "total": attempt.total,
        "percent": percent(attempt) if attempt.submitted_at else None,
        "level": level(percent(attempt)) if attempt.submitted_at else None,
        "late": attempt.late,
        "started_at": attempt.started_at.isoformat(),
        "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
    }
