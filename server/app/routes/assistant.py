from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.extensions import limiter, visitor_address
from app.schemas.assistant import QuestionSchema
from app.services.assistant import AssistantUnavailable, ask, enabled
from app.utils.roles import current_user, roles_required

assistant_bp = Blueprint("assistant", __name__, url_prefix="/api/assistant")
ROLES = ("director", "admin", "bursar")

SUGGESTIONS = {
    "director": [
        "Give me a quick summary of the school today",
        "How many girls and boys do we have in each class?",
        "Which classes had the lowest attendance this month?",
        "How much fee has been collected this term?",
        "Which classes did best in the last exam?",
        "How much did we spend this week and on what?",
    ],
    "admin": [
        "Who has been absent the most this week?",
        "Summarise attendance for the last 7 days",
        "What notices went out recently?",
        "How did Grade 6 do in the last exam?",
        "How many leave-out requests are waiting?",
    ],
    "bursar": [
        "How much did we collect this week?",
        "Which class has the lowest fee collection this term?",
        "Who has the largest balances?",
        "Draft an SMS reminding parents to clear fee balances before closing day",
        "Break down today's payments by method",
        "What did we spend this week compared to what we collected?",
    ],
}


def asker():
    verify_jwt_in_request(optional=True)
    identity = get_jwt_identity()
    return f"user:{identity}" if identity else visitor_address()


@assistant_bp.get("")
@roles_required(*ROLES)
def status():
    return jsonify(enabled=enabled(), suggestions=SUGGESTIONS[current_user().role])


@assistant_bp.post("/ask")
@roles_required(*ROLES)
@limiter.limit("10 per minute;120 per day", key_func=asker)
def ask_question():
    if not enabled():
        return jsonify(error="The assistant has not been switched on yet."), 503
    data = QuestionSchema().load(request.get_json() or {})
    try:
        result = ask(current_user(), data["question"], data["history"][-10:])
    except AssistantUnavailable:
        return jsonify(error="The assistant is busy right now. Please try again in a minute."), 503
    return jsonify(result)
