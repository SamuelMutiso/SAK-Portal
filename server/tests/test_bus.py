from app.extensions import db
from app.models import Student
from tests.conftest import login


def stop(app, name="EPZ Gate"):
    student = db.session.get(Student, 1)
    student.transport_stop = name
    db.session.commit()


def test_full_bus_day_with_sms_at_each_step(client, app, driver_headers, parent_headers):
    stop(app)
    picked = client.post("/api/trips/log", json={"student_id": 1, "event": "boarded"}, headers=driver_headers).get_json()
    assert "picked up by the school bus at EPZ Gate" in picked["sms"]["message"]
    assert client.post("/api/trips/log", json={"student_id": 1, "event": "dropped"}, headers=driver_headers).status_code == 201
    assert client.post("/api/trips/log", json={"student_id": 1, "event": "arrived"}, headers=driver_headers).status_code == 409
    client.post("/api/trips/log", json={"student_id": 1, "event": "boarded"}, headers=driver_headers)
    arrived = client.post("/api/trips/bulk", json={"event": "arrived"}, headers=driver_headers).get_json()
    assert arrived["count"] == 1 and "arrived safely at school" in arrived["sms"]["message"]
    assert client.post("/api/trips/bulk", json={"event": "arrived"}, headers=driver_headers).get_json()["count"] == 0
    left = client.post("/api/trips/bulk", json={"event": "left"}, headers=driver_headers).get_json()
    assert left["count"] == 1 and "left school" in left["sms"]["message"]
    dropped = client.post("/api/trips/log", json={"student_id": 1, "event": "dropped"}, headers=driver_headers).get_json()
    assert "dropped off at EPZ Gate" in dropped["sms"]["message"]
    events = [item["event"] for item in client.get("/api/trips/student/1", headers=parent_headers).get_json()]
    assert events[-4:] == ["boarded", "arrived", "left", "dropped"]


def test_school_sees_the_live_board(client, app, driver_headers, admin_headers, teacher_headers):
    stop(app, "Yukos")
    client.post("/api/trips/log", json={"student_id": 1, "event": "boarded"}, headers=driver_headers)
    board = client.get("/api/trips/today", headers=admin_headers).get_json()["routes"][0]
    assert board["counts"]["on_bus"] == 1 and board["learners"][0]["stop"] == "Yukos"
    client.post("/api/trips/bulk", json={"event": "arrived"}, headers=driver_headers)
    mine = client.get("/api/trips/today", headers=teacher_headers).get_json()["routes"][0]
    assert mine["counts"]["at_school"] == 1 and mine["learners"][0]["label"] == "Arrived at school"
    assert client.get("/api/trips/today", headers=login(client, "parent@test.com")).status_code == 403


def test_parent_catch_up_shows_the_bus(client, app, driver_headers, parent_headers):
    client.post("/api/trips/log", json={"student_id": 1, "event": "boarded"}, headers=driver_headers)
    data = client.get("/api/catch-up/1", headers=parent_headers).get_json()
    assert data["bus"]["event"] == "boarded"


def test_only_whole_bus_steps_can_be_bulk(client, driver_headers):
    assert client.post("/api/trips/bulk", json={"event": "dropped"}, headers=driver_headers).status_code == 400
