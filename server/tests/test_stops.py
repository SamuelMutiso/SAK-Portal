import requests

from app.extensions import db
from app.models import Student, TransportRoute
from app.services import geo
from app.services.learning_demo import DEMO_STOPS, add_demo_stops


def login(client, email):
    return {"Authorization": f"Bearer {client.post('/api/auth/login', json={'email': email, 'password': 'password123'}).get_json()['access_token']}"}


def test_demo_stops_are_replaced_and_learners_moved(app):
    route = TransportRoute.query.first()
    route.name = "Kitengela Town Route"
    route.stops = [{"name": "Success Academy", "lat": -1.4805, "lng": 36.9585}, {"name": "Kaputiei North", "lat": -1.445, "lng": 36.98}]
    student = Student.query.filter_by(transport_route_id=route.id).first() or Student.query.first()
    student.transport_route_id = route.id
    student.transport_stop = "Kaputiei North"
    db.session.commit()
    add_demo_stops()
    assert route.stops == DEMO_STOPS["Kitengela Town Route"]
    assert student.transport_stop in {stop["name"] for stop in route.stops[1:]}
    route.stops = [route.stops[0], {"name": "Our Own Stop", "lat": -1.49, "lng": 36.95}]
    db.session.commit()
    add_demo_stops()
    assert route.stops[1]["name"] == "Our Own Stop"


def test_admin_moves_and_renames_stops(client, app):
    route = TransportRoute.query.first()
    route.stops = [{"name": "Success Academy", "lat": -1.4805, "lng": 36.9585}, {"name": "Chuna", "lat": -1.5, "lng": 36.96}, {"name": "Yukos", "lat": -1.5, "lng": 36.95}]
    kept, renamed = Student.query.limit(2).all()
    for student, stop in ((kept, "Yukos"), (renamed, "Chuna")):
        student.transport_route_id = route.id
        student.transport_stop = stop
    db.session.commit()
    admin = login(client, "admin@test.com")
    new = [{"name": "Success Academy", "lat": -1.47, "lng": 36.96}, {"name": "Chuna Estate", "was": "Chuna", "lat": -1.50355, "lng": 36.96415}]
    saved = client.patch(f"/api/transport/{route.id}", json={"stops": new}, headers=admin)
    assert saved.status_code == 200
    assert saved.get_json()["stops"][1] == {"name": "Chuna Estate", "lat": -1.50355, "lng": 36.96415}
    assert renamed.transport_stop == "Chuna Estate" and kept.transport_stop is None
    bad = [{"name": "Success Academy", "lat": -1.47, "lng": 36.96}, {"name": "London", "lat": 51.5, "lng": -0.1}]
    assert "outside Kenya" in client.patch(f"/api/transport/{route.id}", json={"stops": bad}, headers=admin).get_json()["error"]
    twice = [new[0], {"name": "A", "lat": -1.4, "lng": 36.9}]
    assert client.patch(f"/api/transport/{route.id}", json={"stops": twice}, headers=admin).status_code == 400
    assert client.patch(f"/api/transport/{route.id}", json={"stops": [new[0]]}, headers=admin).status_code == 400
    assert client.patch(f"/api/transport/{route.id}", json={"stops": new}, headers=login(client, "parent@test.com")).status_code == 403


def test_place_search(client, app, monkeypatch):
    calls = []

    class Reply:
        def raise_for_status(self):
            pass

        def json(self):
            return [{"name": "Milimani Shopping Centre", "display_name": "Milimani Shopping Centre, Olkeri Road, Kitengela ward, Kajiado East, Kenya", "lat": "-1.4925812", "lon": "36.9542311"}]

    def fake_get(url, **kwargs):
        calls.append(kwargs)
        return Reply()

    geo.PLACES.clear()
    monkeypatch.setattr(geo.requests, "get", fake_get)
    admin = login(client, "admin@test.com")
    found = client.get("/api/transport/places?q=Milimani Kitengela", headers=admin).get_json()
    assert found == [{"name": "Milimani Shopping Centre", "area": "Olkeri Road, Kitengela ward, Kajiado East", "lat": -1.492581, "lng": 36.954231}]
    assert "SuccessAcademyPortal" in calls[0]["headers"]["User-Agent"] and calls[0]["params"]["countrycodes"] == "ke"
    client.get("/api/transport/places?q=milimani kitengela", headers=admin)
    assert len(calls) == 1
    assert client.get("/api/transport/places?q=ab", headers=admin).status_code == 400
    assert client.get("/api/transport/places?q=Milimani", headers=login(client, "parent@test.com")).status_code == 403

    def broken(url, **kwargs):
        raise requests.ConnectionError()

    monkeypatch.setattr(geo.requests, "get", broken)
    assert client.get("/api/transport/places?q=Yukos", headers=admin).status_code == 503
