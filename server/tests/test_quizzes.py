from app.models import Classroom, QuizAttempt
from tests.conftest import login

QUESTIONS = [
    {"kind": "choice", "prompt": "Biggest?", "options": ["1/3", "1/2", "1/4"], "answer": "1", "explanation": "Half is biggest"},
    {"kind": "short", "prompt": "Half of 10?", "answer": "5\nfive", "explanation": "10 / 2"},
    {"kind": "short", "prompt": "0.5 as a fraction?", "answer": "1/2"},
]


def grade(name):
    return Classroom.query.filter_by(name=name).first().id


def make_quiz(client, headers, classroom_id, published=True, purpose="practice", subject="Mathematics", limit=None):
    return client.post("/api/quizzes", json={"classroom_id": classroom_id, "purpose": purpose, "subject": subject, "title": "Fractions",
                                             "time_limit": limit, "is_published": published, "questions": QUESTIONS}, headers=headers)


def ethan(client, headers):
    return client.get("/api/students", headers=headers).get_json()[0]["id"]


def test_teacher_creates_for_own_class_and_questions_are_checked(client):
    teacher = login(client, "teacher@test.com")
    assert make_quiz(client, teacher, grade("Grade 4")).status_code == 201
    assert make_quiz(client, teacher, grade("Grade 5")).status_code == 403
    assert make_quiz(client, teacher, grade("Grade 4"), purpose="placement").status_code == 403
    bad = client.post("/api/quizzes", json={"classroom_id": grade("Grade 4"), "subject": "Mathematics", "title": "Bad",
                                            "questions": [{"kind": "choice", "prompt": "Pick", "options": ["only one"], "answer": "0"}]}, headers=teacher)
    assert bad.status_code == 400


def test_parent_takes_quiz_without_seeing_answers_and_gets_marked(client):
    quiz = make_quiz(client, login(client, "teacher@test.com"), grade("Grade 4")).get_json()
    parent = login(client, "parent@test.com")
    child = ethan(client, parent)
    listed = client.get(f"/api/quizzes?student_id={child}", headers=parent).get_json()
    assert listed[0]["title"] == "Fractions" and listed[0]["my_latest"] is None
    started = client.post(f"/api/quizzes/{quiz['id']}/start", json={"student_id": child}, headers=parent)
    assert started.status_code == 201
    body = started.get_json()
    assert all("answer" not in question and "explanation" not in question for question in body["questions"])
    ids = [question["id"] for question in body["questions"]]
    submitted = client.post(f"/api/attempts/{body['attempt_id']}/submit", json={"answers": {str(ids[0]): "1", str(ids[1]): " FIVE ", str(ids[2]): "1/3"}}, headers=parent)
    result = submitted.get_json()
    assert result["result"]["score"] == 2 and result["result"]["total"] == 3 and result["result"]["percent"] == 67
    assert [item["correct"] for item in result["review"]] == [True, True, False]
    assert result["review"][2]["right_answer"] == "1/2"
    again = client.post(f"/api/attempts/{body['attempt_id']}/submit", json={"answers": {}}, headers=parent)
    assert again.status_code == 409
    assert client.get(f"/api/quizzes?student_id={child}", headers=parent).get_json()[0]["my_best"] == 67


def test_quiz_privacy_rules(client):
    teacher = login(client, "teacher@test.com")
    draft = make_quiz(client, teacher, grade("Grade 4"), published=False).get_json()
    parent = login(client, "parent@test.com")
    child = ethan(client, parent)
    assert client.get(f"/api/quizzes?student_id={child}", headers=parent).get_json() == []
    assert client.post(f"/api/quizzes/{draft['id']}/start", json={"student_id": child}, headers=parent).status_code == 403
    assert client.get(f"/api/quizzes/{draft['id']}", headers=parent).status_code == 403
    live = make_quiz(client, teacher, grade("Grade 4")).get_json()
    other = login(client, "other@test.com")
    assert client.post(f"/api/quizzes/{live['id']}/start", json={"student_id": child}, headers=other).status_code == 403
    started = client.post(f"/api/quizzes/{live['id']}/start", json={"student_id": child}, headers=parent).get_json()
    assert client.post(f"/api/attempts/{started['attempt_id']}/submit", json={"answers": {}}, headers=other).status_code == 403


def test_results_show_scores_hardest_questions_and_who_is_left(client):
    teacher = login(client, "teacher@test.com")
    quiz = make_quiz(client, teacher, grade("Grade 4")).get_json()
    parent = login(client, "parent@test.com")
    started = client.post(f"/api/quizzes/{quiz['id']}/start", json={"student_id": ethan(client, parent)}, headers=parent).get_json()
    ids = [question["id"] for question in started["questions"]]
    client.post(f"/api/attempts/{started['attempt_id']}/submit", json={"answers": {str(ids[0]): "1"}}, headers=parent)
    results = client.get(f"/api/quizzes/{quiz['id']}/results", headers=teacher).get_json()
    assert results["learners"][0]["name"] == "Ethan M" and results["learners"][0]["percent"] == 33
    assert results["hardest"][0]["percent_right"] == 0
    assert client.get(f"/api/quizzes/{quiz['id']}/results", headers=parent).status_code == 403
    edited = client.put(f"/api/quizzes/{quiz['id']}", json={"classroom_id": grade("Grade 4"), "subject": "Mathematics", "title": "Renamed", "is_published": False, "questions": QUESTIONS[:1]}, headers=teacher).get_json()
    assert edited["title"] == "Renamed" and edited["question_count"] == 3 and "note" in edited


def test_placement_tests_are_for_the_office(client):
    admin = login(client, "admin@test.com")
    quiz = make_quiz(client, admin, grade("Grade 4"), purpose="placement", subject="General", limit=20).get_json()
    assert client.get("/api/quizzes?purpose=placement", headers=login(client, "teacher@test.com")).get_json() == []
    parent = login(client, "parent@test.com")
    assert client.post(f"/api/quizzes/{quiz['id']}/start", json={"student_id": ethan(client, parent)}, headers=parent).status_code == 403
    assert client.post(f"/api/quizzes/{quiz['id']}/start", json={}, headers=admin).status_code == 400
    started = client.post(f"/api/quizzes/{quiz['id']}/start", json={"candidate_name": "New Applicant", "candidate_phone": "0712345678"}, headers=admin).get_json()
    assert started["seconds_left"] == 1200
    ids = [question["id"] for question in started["questions"]]
    client.post(f"/api/attempts/{started['attempt_id']}/submit", json={"answers": {str(ids[0]): "1", str(ids[1]): "5", str(ids[2]): "1/2"}}, headers=admin)
    results = client.get(f"/api/quizzes/{quiz['id']}/results", headers=admin).get_json()
    assert results["learners"][0]["name"] == "New Applicant" and results["learners"][0]["percent"] == 100
    assert QuizAttempt.query.count() == 1


def test_catch_up_counts_waiting_quizzes(client):
    make_quiz(client, login(client, "teacher@test.com"), grade("Grade 4"))
    parent = login(client, "parent@test.com")
    data = client.get(f"/api/catch-up/{ethan(client, parent)}", headers=parent).get_json()
    assert data["quizzes_waiting"] == {"count": 1, "titles": ["Fractions"]}
