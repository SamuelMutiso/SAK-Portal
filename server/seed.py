import random
import string
from datetime import date, datetime, timedelta

from app import create_app
from app.curriculum import COMPETENCIES, CURRENT_TERM, VALUES, learning_areas_for, uses_marks
from app.extensions import db
from app.models import (
    Acknowledgement,
    Assessment,
    Attendance,
    AuthorizedPickup,
    Book,
    Classroom,
    Club,
    DiaryEntry,
    Event,
    Homework,
    LeaveRequest,
    Loan,
    Notice,
    Payment,
    PortfolioItem,
    Student,
    TermReport,
    TransportLog,
    TransportRoute,
    User,
)
from app.models.assessment import level_for
from app.routes.notices import recipients_for

PASSWORD = "Success@2026"
DOMAIN = "successacademy.ac.ke"

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

PARENT_NAMES = ["Jane", "Joseph", "Lucy", "Moses", "Rose", "Daniel", "Grace", "Peter"]

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
    ("Scouts", "Kenya Scouts Association troop: camping, first aid and service", "Friday"),
    ("Girl Guides", "Leadership, life skills and community service", "Friday"),
    ("4K Club", "School garden, poultry and farming skills", "Thursday"),
    ("Wildlife Club", "Conservation, tree planting and park visits", "Wednesday"),
    ("Music and Drama", "Choir, verses and plays for the Kenya Music Festival", "Tuesday"),
    ("Journalism Club", "School news, photography and the termly magazine", "Monday"),
    ("Science Club", "Experiments and projects for the science fair", "Wednesday"),
    ("Red Cross", "First aid and health awareness", "Monday"),
    ("Chess Club", "Strategy, competitions and inter-school games", "Tuesday"),
    ("Swimming", "Lessons for beginners and the school team", "Thursday"),
    ("Football", "Boys and girls teams for school games", "Tuesday"),
    ("Athletics", "Track and field for the school sports day and county games", "Wednesday"),
]

BOOKS = [
    ("Charlotte's Web", "E. B. White", "Upper Primary", 3),
    ("Matilda", "Roald Dahl", "Upper Primary", 2),
    ("The Lion, the Witch and the Wardrobe", "C. S. Lewis", "Upper Primary", 2),
    ("Blossoms of the Savannah", "H. R. Ole Kulet", "Junior Secondary", 3),
    ("Kidagaa Kimemwozea", "Ken Walibora", "Junior Secondary", 3),
    ("The River Between", "Ngugi wa Thiong'o", "Junior Secondary", 2),
    ("Weep Not, Child", "Ngugi wa Thiong'o", "Junior Secondary", 2),
    ("Things Fall Apart", "Chinua Achebe", "Junior Secondary", 2),
    ("Oxford Primary Atlas for Kenya", "Oxford University Press", "Upper Primary", 5),
    ("My First Picture Dictionary", "Longhorn Publishers", "Lower Primary", 4),
]

PORTFOLIO_PHOTOS = [
    ("/photos/performing-arts.jpg", "Class play performance", "Creative Arts"),
    ("/photos/choir.jpg", "End of term choir", "Creative Arts"),
    ("/photos/school-trip.jpg", "Field trip report", "Social Studies"),
]


def make_user(name, role, email, phone):
    user = User(full_name=name, email=email, phone=phone, role=role)
    user.set_password(PASSWORD)
    db.session.add(user)
    return user


def email_for(name):
    return name.lower().replace(" ", ".") + "@" + DOMAIN


def random_code(length):
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


def school_days(count):
    days = []
    day = date.today()
    while len(days) < count:
        if day.weekday() < 5:
            days.append(day)
        day -= timedelta(days=1)
    return days


def seed_assessments(student, ability):
    level = student.classroom.level
    areas = learning_areas_for(level)
    if uses_marks(level):
        late_class = student.classroom.name in ("Grade 6", "Grade 8")
        skipped = {area for area in areas if late_class and random.random() < 0.06}
        for exam in ("Opener", "Mid-Term"):
            for area in areas:
                if area in skipped:
                    continue
                score = max(10, min(99, ability + random.randint(-15, 12)))
                db.session.add(Assessment(
                    student=student, subject=area, term=CURRENT_TERM, exam=exam,
                    score=score, level=level_for(score), teacher_id=student.classroom.teacher_id,
                ))
    else:
        for area in areas:
            score = max(10, min(99, ability + random.randint(-15, 12)))
            db.session.add(Assessment(
                student=student, subject=area, term=CURRENT_TERM, exam="Mid-Term",
                level=level_for(score), teacher_id=student.classroom.teacher_id,
            ))


def seed_term_report(student, head_comment=True):
    choices = ["EE", "ME", "ME", "AE"]
    db.session.add(TermReport(
        student=student,
        term=CURRENT_TERM,
        competencies={name: random.choice(choices) for name in COMPETENCIES},
        values={name: random.choice(["EE", "ME", "ME"]) for name in VALUES},
        co_curricular=", ".join(club.name for club in student.clubs) or "Physical education",
        teacher_comment=f"{student.first_name} participates well in class and works well with others. Keep reading every evening.",
        head_comment="A good term. Keep up the effort." if head_comment else None,
        closing_date=date(2026, 10, 30),
        opening_date=date(2027, 1, 5),
    ))


def seed():
    random.seed(7)
    db.drop_all()
    db.create_all()

    admin = make_user("School Admin", "admin", f"admin@{DOMAIN}", "0704558765")
    teachers = [make_user(name, "teacher", email_for(name), f"07{20 + i}{i:06d}") for i, name in enumerate(TEACHERS)]
    drivers = [
        make_user("John Muli", "driver", f"driver@{DOMAIN}", "0711000001"),
        make_user("Paul Kioko", "driver", f"paul.kioko@{DOMAIN}", "0711000002"),
    ]

    classrooms = []
    for (name, level), teacher in zip(CLASSES, teachers):
        classroom = Classroom(name=name, level=level, teacher=teacher)
        db.session.add(classroom)
        classrooms.append(classroom)

    routes = []
    for data, driver in zip(ROUTES, drivers):
        route = TransportRoute(**data, driver=driver)
        db.session.add(route)
        routes.append(route)

    clubs = []
    for index, (name, description, day) in enumerate(CLUBS):
        club = Club(name=name, description=description, meeting_day=day, patron=teachers[(index + 3) % len(teachers)])
        db.session.add(club)
        clubs.append(club)

    students = []
    number = 1000
    for classroom in classrooms:
        for _ in range(random.randint(6, 10)):
            number += 1
            last_name = random.choice(LAST_NAMES)
            parent = make_user(f"{random.choice(PARENT_NAMES)} {last_name}", "parent", f"parent{number}@{DOMAIN}", f"07{random.randint(10, 99)}{number:06d}")
            boarding_level = classroom.level in ("Upper Primary", "Junior Secondary")
            is_boarder = boarding_level and random.random() < 0.4
            student = Student(
                admission_number=f"SAK{number}",
                upi=random_code(7),
                assessment_number=f"4174{number:05d}" if classroom.name in ("Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9") and random.random() > 0.08 else None,
                first_name=random.choice(FIRST_NAMES),
                last_name=last_name,
                gender=random.choice(["Male", "Female"]),
                date_of_birth=date(2026 - 4 - classrooms.index(classroom), random.randint(1, 12), random.randint(1, 28)),
                is_boarder=is_boarder,
                classroom=classroom,
                parent=parent,
                transport_route=None if is_boarder else random.choice(routes + [None]),
                fee_balance=random.choice([0, 0, 0, 2500, 5000, 8500, 12000, 18500]),
                emergency_contact_name=f"{random.choice(PARENT_NAMES)} {last_name}",
                emergency_contact_phone=f"0722{number:06d}",
            )
            if classroom.level != "Pre-Primary":
                student.clubs = random.sample(clubs, random.randint(0, 2))
            db.session.add(student)
            students.append(student)

    demo_parent = make_user("Mary Mutiso", "parent", f"parent@{DOMAIN}", "0722000000")
    grade4, pp2, grade7 = classrooms[6], classrooms[2], classrooms[9]
    ethan = Student(
        admission_number="SAK0001", upi="A7K2M9Q", assessment_number="417400001", first_name="Ethan", last_name="Mutiso",
        gender="Male", date_of_birth=date(2016, 5, 14), classroom=grade4, parent=demo_parent,
        transport_route=routes[0], clubs=[clubs[9], clubs[11]], fee_balance=18500,
        emergency_contact_name="Daniel Mutiso", emergency_contact_phone="0733000000",
    )
    neema = Student(
        admission_number="SAK0002", upi="B3N8P1L", first_name="Neema", last_name="Mutiso", gender="Female",
        date_of_birth=date(2021, 2, 3), classroom=pp2, parent=demo_parent, transport_route=routes[0], fee_balance=5000,
        emergency_contact_name="Daniel Mutiso", emergency_contact_phone="0733000000",
    )
    amani = Student(
        admission_number="SAK0003", upi="C9R4T6W", assessment_number="417400003", first_name="Amani", last_name="Mutiso",
        gender="Female", date_of_birth=date(2013, 8, 21), classroom=grade7, parent=demo_parent, is_boarder=True,
        clubs=[clubs[4], clubs[6]], fee_balance=0,
        emergency_contact_name="Daniel Mutiso", emergency_contact_phone="0733000000",
    )
    db.session.add_all([ethan, neema, amani])
    students += [ethan, neema, amani]
    db.session.flush()

    for child in (ethan, neema, amani):
        db.session.add(AuthorizedPickup(student=child, full_name="Daniel Mutiso", relationship="Father", phone="0733000000"))
        db.session.add(AuthorizedPickup(student=child, full_name="Rose Wanjiru", relationship="Aunt", phone="0744000000"))

    for student in students:
        seed_assessments(student, random.randint(45, 88))

    for day in school_days(8):
        for student in students:
            weights = [96, 1, 3] if student.parent == demo_parent else [88, 7, 5]
            status = random.choices(["present", "absent", "late"], weights=weights)[0]
            db.session.add(Attendance(student=student, date=day, status=status, recorded_by_id=student.classroom.teacher_id))

    for student in students:
        if student.classroom.name in ("Grade 4", "PP2", "Grade 7") and student not in (ethan, neema, amani):
            seed_term_report(student, head_comment=False)
    for child in (ethan, neema, amani):
        seed_term_report(child)

    meals = ["Porridge, rice and beans, fruit", "Uji, ugali and sukuma, banana", "Tea and bread, pilau, orange"]
    activities = ["Counting with bottle tops, story time, outdoor play", "Colouring shapes, singing, sand play", "Phonics, painting, swings"]
    for classroom in classrooms[:3]:
        for day in school_days(3):
            for student in classroom.students:
                db.session.add(DiaryEntry(
                    student=student, date=day, meals=random.choice(meals), nap=random.choice(["1 hour", "45 minutes", "Did not nap"]),
                    mood=random.choice(["happy", "happy", "calm", "tired"]), activities=random.choice(activities),
                    note="Ate well and played happily with friends." if student == neema else None,
                    teacher_id=classroom.teacher_id,
                ))

    for photo, title, area in PORTFOLIO_PHOTOS:
        db.session.add(PortfolioItem(student=ethan, title=title, learning_area=area, image_url=photo,
                                     description="Teacher photo from class work this term.", teacher_id=grade4.teacher_id))
    db.session.add(PortfolioItem(student=neema, title="Swings and counting", learning_area="Mathematics Activities",
                                 image_url="/photos/swings.jpg", description="Counted friends on the swing in tens.", teacher_id=pp2.teacher_id))
    db.session.add(PortfolioItem(student=amani, title="Graduation day performance", learning_area="Creative Arts and Sports",
                                 image_url="/photos/graduation.jpg", teacher_id=grade7.teacher_id))

    today = date.today()
    for classroom in classrooms[3:]:
        area = learning_areas_for(classroom.level)
        db.session.add(Homework(classroom=classroom, subject="Mathematics", title="Fractions practice",
                                details="Complete exercise 4B in the course book.", due_date=today + timedelta(days=2), teacher=classroom.teacher))
        db.session.add(Homework(classroom=classroom, subject=area[0], title="Composition: My Best Day",
                                details="Write one page in your exercise book.", due_date=today + timedelta(days=4), teacher=classroom.teacher))

    events = [
        ("Sports Day", "sports", "School field", 9, None),
        ("Grade 6 Trip to Nairobi National Park", "trip", "Nairobi National Park", 14, None),
        ("Parents' Academic Day", "meeting", "School hall", 18, None),
        ("Music Festival Rehearsals", "club", "Music room", 5, None),
        ("Term 3 End-Term Assessments", "academic", "Classrooms", 12, 16),
        ("Closing Day", "holiday", "School", 22, None),
    ]
    for title, category, location, start, end in events:
        db.session.add(Event(title=title, category=category, location=location, start_date=today + timedelta(days=start),
                             end_date=today + timedelta(days=end) if end else None))

    notices = [
        Notice(title="Sports Day", body="Sports Day is next Friday. Learners to come in house colours.", audience="all", send_sms=True, sms_count=len(students), author=admin),
        Notice(title="Swimming this Thursday", body="Swimming club members should carry costumes and towels.", audience="club", club=clubs[9], send_sms=True, sms_count=len(clubs[9].students), author=admin),
        Notice(title="Bus delay", body="The Kitengela Town bus will be 20 minutes late this evening due to traffic.", audience="route", transport_route=routes[0], send_sms=True, sms_count=len(routes[0].students), author=admin),
        Notice(title="Grade 4 class meeting", body="Grade 4 parents meeting on Saturday at 10am in the school hall.", audience="class", classroom=grade4, author=grade4.teacher),
        Notice(title="Mid-Term results are out", body="Mid-Term results are now on the parent portal.", audience="all", send_sms=True, sms_count=len(students), author=admin),
        Notice(title="Boarders visiting day", body="Visiting day is on Sunday from 11am to 4pm.", audience="boarders", author=admin),
    ]
    db.session.add_all(notices)
    db.session.flush()

    for notice in notices[:3]:
        recipients = recipients_for(notice)
        for parent in random.sample(recipients, int(len(recipients) * 0.6)):
            if parent != demo_parent:
                db.session.add(Acknowledgement(user=parent, item_type="notice", item_id=notice.id))

    boarders = [student for student in students if student.is_boarder and student != amani]
    db.session.add(LeaveRequest(student=amani, parent=demo_parent, leave_date=today + timedelta(days=3), return_date=today + timedelta(days=5),
                                reason="Family wedding in Machakos", picked_by="Daniel Mutiso (father)"))
    for student in boarders[:2]:
        db.session.add(LeaveRequest(student=student, parent=student.parent, leave_date=today + timedelta(days=2), return_date=today + timedelta(days=3),
                                    reason="Dental appointment", picked_by=student.parent.full_name))

    books = [Book(title=title, author=author, level=level, copies=copies) for title, author, level, copies in BOOKS]
    db.session.add_all(books)
    db.session.flush()
    db.session.add(Loan(book=books[0], student=ethan, borrowed_on=today - timedelta(days=5), due_on=today + timedelta(days=9)))
    db.session.add(Loan(book=books[3], student=amani, borrowed_on=today - timedelta(days=20), due_on=today - timedelta(days=6)))
    for student in random.sample(students, 8):
        book = random.choice(books)
        if book.available > 0:
            borrowed = today - timedelta(days=random.randint(1, 20))
            db.session.add(Loan(book=book, student=student, borrowed_on=borrowed, due_on=borrowed + timedelta(days=14)))

    db.session.add(Payment(student=ethan, amount=10000, phone="0722000000", status="completed", receipt="SJK4T7Q2PA",
                           checkout_id="seed-1", created_at=datetime.now() - timedelta(days=12)))
    db.session.add(Payment(student=amani, amount=24000, phone="0722000000", status="completed", receipt="SJF2N8W1LB",
                           checkout_id="seed-2", created_at=datetime.now() - timedelta(days=20)))

    db.session.add(TransportLog(student=ethan, route_id=routes[0].id, event="boarded",
                                recorded_at=datetime.utcnow().replace(hour=4, minute=12), driver_id=drivers[0].id))

    db.session.commit()

    print(f"Seeded {len(students)} students, {len(teachers)} teachers, {len(clubs)} clubs, {len(books)} books")
    print(f"Logins (password {PASSWORD}):")
    print(f"  admin@{DOMAIN}")
    print(f"  {teachers[6].email}  (Grade 4 teacher)")
    print(f"  {teachers[2].email}  (PP2 teacher)")
    print(f"  parent@{DOMAIN}  (Ethan G4, Neema PP2, Amani G7 boarder)")
    print(f"  driver@{DOMAIN}  (Kitengela Town bus)")


if __name__ == "__main__":
    with create_app().app_context():
        seed()
