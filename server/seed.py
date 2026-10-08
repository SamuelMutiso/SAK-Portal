import random
from datetime import date, timedelta

from app import create_app
from app.extensions import db
from app.models import (
    Assessment,
    Attendance,
    Classroom,
    Club,
    Event,
    Homework,
    Notice,
    Student,
    TransportRoute,
    User,
)
from app.models.assessment import level_for

PASSWORD = "Success@2026"

CLASSES = [
    ("Playgroup", "Pre-Primary"),
    ("PP1", "Pre-Primary"),
    ("PP2", "Pre-Primary"),
    ("Grade 1", "Lower Primary"),
    ("Grade 2", "Lower Primary"),
    ("Grade 3", "Lower Primary"),
    ("Grade 4", "Upper Primary"),
    ("Grade 5", "Upper Primary"),
    ("Grade 6", "Upper Primary"),
    ("Grade 7", "Junior Secondary"),
    ("Grade 8", "Junior Secondary"),
    ("Grade 9", "Junior Secondary"),
]

TEACHERS = [
    "Grace Wanjiru", "Peter Otieno", "Faith Mwende", "James Kiprono", "Mercy Achieng", "David Mutua",
    "Ann Njeri", "Samuel Kariuki", "Joyce Chebet", "Brian Ouma", "Esther Nduta", "Kevin Musyoka",
]

FIRST_NAMES = [
    "Ethan", "Wanjiku", "Baraka", "Amani", "Neema", "Kamau", "Zawadi", "Imani", "Tumaini", "Akinyi",
    "Kevin", "Shiro", "Jabari", "Nia", "Liam", "Makena", "Otieno", "Precious", "Ian", "Mumbua",
]

LAST_NAMES = ["Mwangi", "Ochieng", "Kiptoo", "Mutiso", "Njoroge", "Wambua", "Odhiambo", "Kilonzo", "Kamau", "Nduku"]

ROUTES = [
    {
        "name": "Kitengela Town Route",
        "driver_name": "John Muli",
        "driver_phone": "0711000001",
        "vehicle": "KDA 123A",
        "stops": [
            {"name": "Success Academy", "lat": -1.4805, "lng": 36.9585},
            {"name": "Kitengela Town Centre", "lat": -1.4746, "lng": 36.9620},
            {"name": "EPZ Gate", "lat": -1.4600, "lng": 36.9750},
            {"name": "Yukos", "lat": -1.4520, "lng": 36.9690},
        ],
    },
    {
        "name": "Noonkopir Route",
        "driver_name": "Paul Kioko",
        "driver_phone": "0711000002",
        "vehicle": "KDB 456B",
        "stops": [
            {"name": "Success Academy", "lat": -1.4805, "lng": 36.9585},
            {"name": "Milimani", "lat": -1.4870, "lng": 36.9500},
            {"name": "Noonkopir", "lat": -1.4950, "lng": 36.9420},
            {"name": "Acacia", "lat": -1.5020, "lng": 36.9530},
        ],
    },
]

CLUBS = [
    ("Athletics", "Track and field training", "Tuesday"),
    ("Performing Arts & Music", "Dance, drama and choir", "Wednesday"),
    ("Agriculture", "School garden and farming", "Thursday"),
    ("Media Production", "Photography, video and school news", "Friday"),
    ("ICT Club", "Coding and computer skills", "Monday"),
    ("Swimming", "Swimming lessons for all levels", "Thursday"),
]

SUBJECTS = ["Mathematics", "English", "Kiswahili", "Science", "Social Studies", "Creative Arts"]


def make_user(name, role, index):
    email = name.lower().replace(" ", ".") + "@successacademy.ac.ke"
    user = User(full_name=name, email=email, phone=f"07{random.randint(10, 99)}{index:06d}", role=role)
    user.set_password(PASSWORD)
    db.session.add(user)
    return user


def seed():
    random.seed(7)
    db.drop_all()
    db.create_all()

    admin = User(full_name="School Admin", email="admin@successacademy.ac.ke", phone="0704558765", role="admin")
    admin.set_password(PASSWORD)
    db.session.add(admin)

    teachers = [make_user(name, "teacher", i) for i, name in enumerate(TEACHERS)]
    classrooms = []
    for (name, level), teacher in zip(CLASSES, teachers):
        classroom = Classroom(name=name, level=level, teacher=teacher)
        db.session.add(classroom)
        classrooms.append(classroom)

    routes = [TransportRoute(**route) for route in ROUTES]
    db.session.add_all(routes)

    clubs = []
    for (name, description, day), patron in zip(CLUBS, teachers[3:]):
        club = Club(name=name, description=description, meeting_day=day, patron=patron)
        db.session.add(club)
        clubs.append(club)

    demo_parent = User(full_name="Mary Mutiso", email="parent@successacademy.ac.ke", phone="0722000000", role="parent")
    demo_parent.set_password(PASSWORD)
    db.session.add(demo_parent)

    students = []
    number = 1000
    for classroom in classrooms:
        for _ in range(random.randint(6, 10)):
            number += 1
            last_name = random.choice(LAST_NAMES)
            parent = make_user(f"{random.choice(['Jane', 'Joseph', 'Lucy', 'Moses', 'Rose', 'Daniel'])} {last_name}", "parent", number)
            parent.email = f"parent{number}@successacademy.ac.ke"
            boarding_level = classroom.level in ("Upper Primary", "Junior Secondary")
            is_boarder = boarding_level and random.random() < 0.4
            student = Student(
                admission_number=f"SAK{number}",
                first_name=random.choice(FIRST_NAMES),
                last_name=last_name,
                gender=random.choice(["Male", "Female"]),
                date_of_birth=date(2026 - 4 - classrooms.index(classroom), random.randint(1, 12), random.randint(1, 28)),
                is_boarder=is_boarder,
                classroom=classroom,
                parent=parent,
                transport_route=None if is_boarder else random.choice(routes + [None]),
            )
            if classroom.level != "Pre-Primary":
                student.clubs = random.sample(clubs, random.randint(0, 2))
            db.session.add(student)
            students.append(student)

    grade4 = classrooms[6]
    pp2 = classrooms[2]
    first_child = Student(
        admission_number="SAK0001", first_name="Ethan", last_name="Mutiso", gender="Male",
        date_of_birth=date(2016, 5, 14), classroom=grade4, parent=demo_parent,
        transport_route=routes[0], clubs=[clubs[0], clubs[5]],
    )
    second_child = Student(
        admission_number="SAK0002", first_name="Neema", last_name="Mutiso", gender="Female",
        date_of_birth=date(2021, 2, 3), classroom=pp2, parent=demo_parent, transport_route=routes[0],
    )
    db.session.add_all([first_child, second_child])
    students += [first_child, second_child]
    db.session.flush()

    today = date.today()
    for offset in range(10):
        day = today - timedelta(days=offset)
        if day.weekday() >= 5:
            continue
        for student in students:
            status = random.choices(["present", "absent", "late"], weights=[88, 7, 5])[0]
            db.session.add(Attendance(student=student, date=day, status=status, recorded_by_id=student.classroom.teacher_id))

    for student in students:
        student.fee_balance = random.choice([0, 0, 0, 2500, 5000, 8500, 12000, 18500])
        if student.classroom.level == "Pre-Primary":
            continue
        ability = random.randint(45, 88)
        for exam in ("Opener", "Mid-Term"):
            for subject in SUBJECTS:
                score = max(10, min(99, ability + random.randint(-15, 12)))
                db.session.add(Assessment(
                    student=student, subject=subject, term="Term 3 2026", exam=exam,
                    score=score, level=level_for(score), teacher_id=student.classroom.teacher_id,
                ))

    for classroom in classrooms[3:]:
        db.session.add(Homework(
            classroom=classroom, subject="Mathematics", title="Fractions practice",
            details="Complete exercise 4B in the course book.", due_date=today + timedelta(days=2),
            teacher=classroom.teacher,
        ))
        db.session.add(Homework(
            classroom=classroom, subject="English", title="Composition: My Best Day",
            details="Write one page in your exercise book.", due_date=today + timedelta(days=4),
            teacher=classroom.teacher,
        ))

    events = [
        ("Sports Day", "sports", "School field", 9, None),
        ("Grade 6 Trip to Nairobi National Park", "trip", "Nairobi National Park", 14, None),
        ("Parents' Academic Day", "meeting", "School hall", 18, None),
        ("Music Festival Rehearsals", "club", "Music room", 5, None),
        ("Term 3 End-Term Exams", "academic", "Classrooms", 30, 34),
        ("Closing Day", "holiday", "School", 38, None),
    ]
    for title, category, location, start, end in events:
        db.session.add(Event(
            title=title, category=category, location=location,
            start_date=today + timedelta(days=start),
            end_date=today + timedelta(days=end) if end else None,
        ))

    notices = [
        Notice(title="Sports Day", body="Sports Day is next Friday. Learners to come in house colours.", audience="all", send_sms=True, sms_count=len(students), author=admin),
        Notice(title="Swimming this Thursday", body="Swimming club members should carry costumes and towels.", audience="club", club=clubs[5], send_sms=True, sms_count=len(clubs[5].students), author=admin),
        Notice(title="Bus delay", body="The Kitengela Town bus will be 20 minutes late this evening due to traffic.", audience="route", transport_route=routes[0], send_sms=True, sms_count=len(routes[0].students), author=admin),
        Notice(title="Grade 4 class meeting", body="Grade 4 parents meeting on Saturday at 10am in the school hall.", audience="class", classroom=grade4, author=grade4.teacher),
        Notice(title="Mid-Term results are out", body="Mid-Term exam results are now on the parent portal.", audience="all", send_sms=True, sms_count=len(students), author=admin),
        Notice(title="Boarders visiting day", body="Visiting day is on Sunday from 11am to 4pm.", audience="boarders", author=admin),
    ]
    db.session.add_all(notices)
    db.session.commit()

    print(f"Seeded {len(students)} students, {len(teachers)} teachers, {len(clubs)} clubs")
    print(f"Logins (password {PASSWORD}):")
    print("  admin@successacademy.ac.ke")
    print(f"  {teachers[6].email}  (Grade 4 teacher)")
    print("  parent@successacademy.ac.ke")


if __name__ == "__main__":
    with create_app().app_context():
        seed()
