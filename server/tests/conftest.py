import pytest

from app import create_app
from app.config import TestConfig
from app.extensions import db
from app.models import Book, Classroom, Club, Consent, Student, TransportRoute, User
from app.policies import POLICY_VERSION


@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        seed_basics()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def make_user(name, email, role, phone):
    user = User(full_name=name, email=email, phone=phone, role=role)
    user.set_password("password123")
    db.session.add(user)
    return user


def seed_basics():
    make_user("Admin", "admin@test.com", "admin", "0700000001")
    teacher = make_user("Teacher", "teacher@test.com", "teacher", "0700000002")
    parent = make_user("Parent", "parent@test.com", "parent", "0700000003")
    other_parent = make_user("Other Parent", "other@test.com", "parent", "0700000004")
    grade4 = Classroom(name="Grade 4", level="Upper Primary", teacher=teacher)
    grade5 = Classroom(name="Grade 5", level="Upper Primary")
    driver = make_user("Driver", "driver@test.com", "driver", "0700000005")
    route = TransportRoute(name="Town Route", driver=driver, stops=[])
    swimming = Club(name="Swimming")
    child = Student(admission_number="A1", first_name="Ethan", last_name="M", classroom=grade4, parent=parent, fee_balance=5000, transport_route=route, is_boarder=True)
    other = Student(admission_number="A2", first_name="Zawadi", last_name="K", classroom=grade5, parent=other_parent)
    swimming.students = [child]
    db.session.add_all([grade4, grade5, swimming, child, other, route, Book(title="Matilda", copies=1)])
    db.session.commit()
    for user in User.query.all():
        accept_policies(user)
    db.session.commit()


def accept_policies(user):
    db.session.add(Consent(user_id=user.id, version=POLICY_VERSION, accepted_terms=True, accepted_privacy=True, signature=user.full_name))


def login(client, email):
    response = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    return {"Authorization": f"Bearer {response.get_json()['access_token']}"}


@pytest.fixture
def admin_headers(client):
    return login(client, "admin@test.com")


@pytest.fixture
def teacher_headers(client):
    return login(client, "teacher@test.com")


@pytest.fixture
def parent_headers(client):
    return login(client, "parent@test.com")


@pytest.fixture
def driver_headers(client):
    return login(client, "driver@test.com")


@pytest.fixture
def other_parent_headers(client):
    return login(client, "other@test.com")
