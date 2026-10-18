from datetime import datetime, timedelta

from app.extensions import db
from app.models import Classroom, LearningMaterial

MATERIALS = {
    "PP2": [
        ("Language Activities", "Letter sounds", "Sounds of the week: m, a, s, t", "notes",
         "This week we are learning the sounds m, a, s and t.\n- Say each sound with your child and find objects at home that start with it.\n- m for mango, a for apple, s for sun, t for table.\n- Practise writing each letter five times in the air, then on paper."),
        ("Mathematics Activities", "Counting", "Counting 1 to 20 with everyday objects", "notes",
         "Use bottle tops, beans or stones to count up to 20.\n- Ask your child to count out 7, then 12, then 15.\n- Put two groups together and count them all.\n- Sing a counting song while setting the table."),
    ],
    "Grade 1": [
        ("Mathematics", "Addition", "Adding numbers up to 20", "notes",
         "We are adding numbers whose total is up to 20.\n- Use a number line: start at the first number and jump forward.\n- Example: 8 + 5. Start at 8, jump 5 steps, land on 13.\n- Practice: 6 + 7, 9 + 4, 11 + 8."),
        ("Environmental Activities", "Weather", "Types of weather and how we dress", "notes",
         "Sunny, rainy, windy and cloudy days.\n- Each morning this week, ask your child to say what the weather is like.\n- Talk about what we wear on a rainy day and a sunny day."),
    ],
    "Grade 4": [
        ("Mathematics", "Fractions", "Understanding fractions: halves, quarters and thirds", "file",
         "Notes and practice questions for this week's fractions lessons."),
        ("Science and Technology", "Plants", "Parts of a plant and their uses", "notes",
         "A plant has roots, a stem, leaves, flowers and fruits.\n- Roots hold the plant firmly and take in water.\n- The stem carries water to the leaves.\n- Leaves make food for the plant using sunlight.\n- Activity: draw a bean plant and label its parts."),
        ("English", "Reading", "Kenya Education Cloud: free digital books", "link", "https://kec.ac.ke/"),
    ],
    "Grade 5": [
        ("Social Studies", "Physical features", "Main physical features of Kenya", "notes",
         "Mountains: Mount Kenya, Mount Elgon. Lakes: Lake Victoria, Lake Turkana. Rivers: Tana, Athi.\n- Find each one on the map of Kenya in your atlas.\n- Write one way people use each feature."),
        ("Mathematics", "Decimals", "Adding and subtracting decimals", "notes",
         "Line up the decimal points before adding or subtracting.\n- 3.45 + 2.3 = 5.75\n- 7.2 - 4.65 = 2.55\n- Practice: 12.5 + 3.75, 9.0 - 2.35"),
    ],
    "Grade 6": [
        ("Mathematics", "KPSEA revision", "KPSEA revision: number and measurement", "notes",
         "Revision topics for the end of Grade 6 assessment.\n- Place value up to millions\n- Fractions, decimals and percentages\n- Length, mass, capacity and time\n- Practise one past question set every evening."),
        ("Science and Technology", "Human body", "The digestive system", "notes",
         "Food travels from the mouth to the oesophagus, stomach, small intestine and large intestine.\n- Chew food well.\n- Drink clean water.\n- Eat fruits and vegetables for fibre."),
    ],
    "Grade 7": [
        ("Integrated Science", "Mixtures", "Separating mixtures", "notes",
         "Methods: filtration, evaporation, decantation, sieving and using a magnet.\n- Filtration separates sand from water.\n- Evaporation gets salt from salty water.\n- Try it at home: mix sand and water, then filter it through a clean cloth."),
        ("Pre-Technical Studies", "Safety", "Safety in the workshop", "notes",
         "Always wear protective clothing, keep tools in their place and report any accident to the teacher immediately."),
    ],
}


def pdf_bytes(title, lines):
    def escape(text):
        return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    rows = [f"BT /F1 20 Tf 60 780 Td ({escape(title)}) Tj ET"]
    y = 740
    for line in lines:
        rows.append(f"BT /F1 12 Tf 60 {y} Td ({escape(line)}) Tj ET")
        y -= 22
    stream = "\n".join(rows).encode()
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = b"%PDF-1.4\n"
    offsets = []
    for number, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{number} 0 obj\n".encode() + body + b"\nendobj\n"
    table = len(out)
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode()
    out += b"".join(f"{offset:010d} 00000 n \n".encode() for offset in offsets)
    out += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{table}\n%%EOF\n".encode()
    return out


FRACTIONS = [
    "A fraction shows a part of a whole.",
    "1/2 means one of two equal parts. 1/4 means one of four equal parts.",
    "The top number is the numerator. The bottom number is the denominator.",
    "",
    "Practice:",
    "1. Shade 3/4 of a rectangle.",
    "2. Which is bigger, 1/2 or 1/3? Explain.",
    "3. Amina ate 2/8 of a chapati. What fraction is left?",
    "4. Write two fractions equal to 1/2.",
]


def add_demo_materials():
    if LearningMaterial.query.first():
        return 0
    added = 0
    now = datetime.utcnow()
    for class_name, items in MATERIALS.items():
        classroom = Classroom.query.filter_by(name=class_name).first()
        if not classroom:
            continue
        for index, (subject, topic, title, kind, content) in enumerate(items):
            material = LearningMaterial(classroom_id=classroom.id, subject=subject, topic=topic, title=title, kind=kind,
                                        teacher_id=classroom.teacher_id, created_at=now - timedelta(days=index * 3 + 1))
            if kind == "notes":
                material.body = content
            elif kind == "link":
                material.link_url = content
            else:
                material.body = content
                material.file_data = pdf_bytes("Fractions - Grade 4", FRACTIONS)
                material.file_name = "grade-4-fractions.pdf"
                material.file_type = "application/pdf"
                material.file_size = len(material.file_data)
            db.session.add(material)
            added += 1
    db.session.commit()
    return added


def choice(prompt, options, right, explanation):
    return {"kind": "choice", "prompt": prompt, "options": options, "answer": str(right), "explanation": explanation}


def short(prompt, answers, explanation):
    return {"kind": "short", "prompt": prompt, "options": None, "answer": "\n".join(answers), "explanation": explanation}


QUIZZES = [
    ("Grade 4", "practice", "Mathematics", "Fractions", "Fractions check", 10, [
        choice("What fraction of a pizza is left if you eat 1 of 4 equal slices?", ["1/4", "3/4", "2/4", "4/4"], 1, "4 slices minus 1 eaten leaves 3 of 4, which is 3/4."),
        choice("Which fraction is the biggest?", ["1/3", "1/5", "1/2", "1/4"], 2, "When the top number is 1, the smaller the bottom number, the bigger each part."),
        short("In the fraction 5/8, what is the denominator?", ["8", "eight"], "The denominator is the bottom number. It shows how many equal parts make the whole."),
        choice("Which fraction is equal to 1/2?", ["2/3", "3/6", "1/3", "2/5"], 1, "3 out of 6 is the same as half."),
        short("Amina ate 2/8 of a chapati. What fraction is left?", ["6/8", "3/4"], "8/8 - 2/8 = 6/8, which is the same as 3/4."),
        choice("How many quarters make one whole?", ["2", "3", "4", "8"], 2, "Four quarters make one whole."),
    ]),
    ("Grade 4", "practice", "Science and Technology", "Plants", "Parts of a plant", None, [
        choice("Which part of a plant takes in water from the soil?", ["Leaves", "Roots", "Flowers", "Fruits"], 1, "Roots take in water and hold the plant firmly in the ground."),
        choice("Which part makes food for the plant?", ["Stem", "Roots", "Leaves", "Seeds"], 2, "Leaves use sunlight to make food."),
        short("Which part of a plant carries water from the roots to the leaves?", ["stem", "the stem"], "The stem carries water up to the leaves."),
        choice("Seeds are usually found inside the...", ["Fruit", "Root", "Leaf", "Stem"], 0, "Fruits protect the seeds."),
    ]),
    ("Grade 7", "practice", "Integrated Science", "Mixtures", "Separating mixtures", 15, [
        choice("Which method separates sand from water?", ["Evaporation", "Filtration", "Using a magnet", "Sieving"], 1, "Filter paper lets water pass but keeps the sand."),
        choice("How can you get salt back from salty water?", ["Filtration", "Decantation", "Evaporation", "Sieving"], 2, "Heating evaporates the water and leaves the salt."),
        short("Which tool would you use to separate iron filings from sulphur powder?", ["magnet", "a magnet"], "Iron is attracted to a magnet; sulphur is not."),
        choice("Pouring off a liquid and leaving the solid at the bottom is called...", ["Decantation", "Filtration", "Evaporation", "Distillation"], 0, "Decantation is gently pouring off the liquid."),
        choice("Which mixture can be separated by sieving?", ["Salt and water", "Sand and stones", "Sugar and tea", "Milk and water"], 1, "The stones are too big to pass through the sieve."),
    ]),
    ("Grade 1", "practice", "Mathematics", "Addition", "Adding up to 20", None, [
        short("8 + 5 =", ["13", "thirteen"], "Start at 8 and count 5 more: 9, 10, 11, 12, 13."),
        short("6 + 7 =", ["13", "thirteen"], "6 + 7 = 13."),
        choice("Which sum makes 10?", ["4 + 5", "6 + 4", "3 + 5", "2 + 7"], 1, "6 + 4 = 10."),
        short("9 + 9 =", ["18", "eighteen"], "Double 9 is 18."),
    ]),
    ("PP2", "practice", "Mathematics Activities", "Counting", "Counting fun", None, [
        choice("Which number comes after 7?", ["6", "8", "9", "5"], 1, "7, then 8."),
        choice("How many legs does a chicken have?", ["2", "4", "3", "6"], 0, "A chicken has 2 legs."),
        choice("Which number is the biggest?", ["3", "9", "5", "1"], 1, "9 is the biggest."),
    ]),
    ("Grade 4", "placement", "General", "Joining Grade 4", "Grade 4 entry test", 20, [
        short("25 + 17 =", ["42"], "25 + 17 = 42."),
        short("63 - 28 =", ["35"], "63 - 28 = 35."),
        short("7 x 6 =", ["42"], "7 times 6 is 42."),
        choice("Which number is the largest?", ["908", "980", "899", "890"], 1, "980 has the most hundreds and tens."),
        choice("Choose the correct sentence.", ["She go to school.", "She goes to school.", "She going to school.", "She gone to school."], 1, "With she, we say goes."),
        choice("What is the plural of 'child'?", ["Childs", "Children", "Childes", "Childrens"], 1, "Child becomes children."),
        short("Write the opposite of 'hot'.", ["cold"], "Hot and cold are opposites."),
        choice("Which one is a living thing?", ["Stone", "Chair", "Tree", "Book"], 2, "A tree grows, feeds and reproduces."),
    ]),
    ("Grade 7", "placement", "General", "Joining Grade 7", "Grade 7 entry test", 25, [
        short("What is 3/4 of 80?", ["60"], "80 / 4 = 20, and 20 x 3 = 60."),
        short("0.6 + 0.75 =", ["1.35"], "Line up the decimal points: 0.60 + 0.75 = 1.35."),
        choice("What is 15% of 200?", ["15", "20", "30", "300"], 2, "10% is 20 and 5% is 10, so 15% is 30."),
        choice("Choose the correctly punctuated sentence.", ["where are you going", "Where are you going?", "Where are you going.", "where are you going?"], 1, "A question starts with a capital letter and ends with a question mark."),
        choice("Which organ pumps blood around the body?", ["Lungs", "Liver", "Heart", "Kidney"], 2, "The heart pumps blood."),
        short("Name the capital city of Kenya.", ["Nairobi"], "Nairobi is the capital city of Kenya."),
    ]),
]


def add_demo_quizzes():
    import random

    from app.models import Quiz, QuizAttempt, QuizQuestion, User
    from app.services.quizzes import mark

    if Quiz.query.first():
        return 0
    admin = User.query.filter_by(role="admin").first()
    pick = random.Random(7)
    added = 0
    now = datetime.utcnow()
    for class_name, purpose, subject, topic, title, limit, questions in QUIZZES:
        classroom = Classroom.query.filter_by(name=class_name).first()
        if not classroom:
            continue
        quiz = Quiz(classroom_id=classroom.id, purpose=purpose, subject=subject, topic=topic, title=title, time_limit=limit, is_published=True,
                    teacher_id=admin.id if purpose == "placement" else classroom.teacher_id, created_at=now - timedelta(days=2 + added),
                    instructions="Read each question carefully. You can go back and change an answer before you hand in." if purpose == "practice" else
                    "Give this test to the applicant on a school tablet or computer. Let them work alone.")
        quiz.questions = [QuizQuestion(position=index, **question) for index, question in enumerate(questions)]
        db.session.add(quiz)
        db.session.flush()
        added += 1
        takers = []
        if title == "Fractions check":
            takers = [student for student in classroom.students if student.status == "active" and not (student.parent and student.parent.email.startswith("parent@"))]
        elif purpose == "placement":
            takers = [("Baraka Otieno", "0712345601"), ("Wanjiku Mwangi", "0712345602")]
        for index, taker in enumerate(takers):
            started = now - timedelta(days=1, hours=index)
            if purpose == "placement":
                attempt = QuizAttempt(quiz=quiz, candidate_name=taker[0], candidate_phone=taker[1], taken_by_id=admin.id, started_at=started)
            else:
                attempt = QuizAttempt(quiz=quiz, student_id=taker.id, taken_by_id=taker.parent_id or admin.id, started_at=started)
            skill = pick.uniform(0.35, 0.95)
            answers = {}
            for question in quiz.questions:
                if pick.random() < skill:
                    answers[str(question.id)] = question.answer.split("\n")[0]
                elif question.kind == "choice":
                    answers[str(question.id)] = str((int(question.answer) + 1) % len(question.options))
                else:
                    answers[str(question.id)] = "?"
            db.session.add(attempt)
            mark(attempt, answers)
            attempt.submitted_at = started + timedelta(minutes=pick.randint(4, 9))
            attempt.late = False
    db.session.commit()
    return added


EXPENSES = [
    (0, "Fuel & transport", "Diesel for school bus KCA 123X", 6500, "Rubis Kitengela", "M-Pesa", "TJH4K2LQ9P", True),
    (0, "Food & kitchen", "Vegetables and tomatoes for lunch", 3200, "Mama Wanjiru, Kitengela market", "Cash", None, True),
    (1, "Food & kitchen", "2 bags of maize flour and 1 bag of rice", 9800, "Naivas Kitengela", "M-Pesa", "TJG7P1XW3D", True),
    (1, "Repairs & maintenance", "Fixing broken window in Grade 5 class", 2500, "Joseph Fundi", "Cash", None, False),
    (2, "Fuel & transport", "Diesel for school bus KCB 456Y", 7000, "Total Energies Namanga Road", "M-Pesa", "TJF2M8RT5A", True),
    (2, "Books & stationery", "Exercise books and chalk for the term", 4600, "Text Book Centre", "Bank", "FT26290ABC12", True),
    (3, "Water, power & internet", "KPLC electricity tokens", 5000, "KPLC", "M-Pesa", "TJE9Q4LN2C", True),
    (3, "Cleaning & hygiene", "Detergents, toilet paper and mops", 2850, "Quickmart Kitengela", "Cash", None, False),
    (4, "Food & kitchen", "Milk for Pre-Primary break time", 1800, "Brookside milk vendor", "Cash", None, True),
    (5, "Medical & first aid", "First aid kit refill", 1450, "Kitengela Pharmacy", "M-Pesa", "TJD3R7KS8B", True),
    (6, "Events & trips", "Deposit for Grade 6 trip bus hire", 15000, "Safari Coaches Ltd", "Bank", "FT26285XYZ98", True),
]


def receipt_image(text):
    from html import escape

    lines = "".join(f'<text x="30" y="{120 + index * 44}" font-size="22" fill="#222">{escape(line)}</text>' for index, line in enumerate(text))
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="520" height="360" font-family="Arial, sans-serif">'
        '<rect width="520" height="360" fill="#fffdf6" stroke="#999" stroke-width="2"/>'
        '<text x="30" y="60" font-size="28" font-weight="bold" fill="#111">CASH SALE RECEIPT (DEMO)</text>'
        f"{lines}</svg>"
    ).encode()


def add_demo_expenses():
    from datetime import date

    from app.models import Expense, User

    if Expense.query.first():
        return 0
    bursar = User.query.filter_by(role="bursar").first()
    if not bursar:
        return 0
    today = date.today()
    for days_ago, category, description, amount, paid_to, method, reference, has_receipt in EXPENSES:
        spent = today - timedelta(days=days_ago)
        expense = Expense(spent_on=spent, category=category, description=description, amount=amount, paid_to=paid_to, method=method,
                          reference=reference, recorded_by_id=bursar.id, created_at=datetime.utcnow() - timedelta(days=days_ago, hours=2))
        if has_receipt:
            expense.receipt_data = receipt_image([paid_to, description[:40], f"KES {amount:,}", spent.strftime("%d %b %Y")])
            expense.receipt_name = f"receipt-{spent.isoformat()}.svg"
            expense.receipt_type = "image/svg+xml"
        db.session.add(expense)
    wrong = Expense(spent_on=today - timedelta(days=1), category="Fuel & transport", description="Diesel for school bus KCA 123X", amount=65000,
                    paid_to="Rubis Kitengela", method="Cash", recorded_by_id=bursar.id, voided_at=datetime.utcnow() - timedelta(hours=20),
                    voided_by_id=bursar.id, void_reason="Typed 65,000 instead of 6,500. Correct entry recorded.")
    db.session.add(wrong)
    db.session.commit()
    return len(EXPENSES)


def slip_svg(bank, reference, amount, when, account):
    from html import escape

    rows = [("Date", when.strftime("%d/%m/%Y")), ("Account name", "SUCCESS ACADEMY KITENGELA"), ("Account / Ref", account),
            ("Amount (KES)", f"{amount:,}.00"), ("Transaction no.", reference), ("Depositor", "Parent")]
    lines = "".join(
        f'<text x="40" y="{130 + index * 60}" font-size="18" fill="#5a5a5a">{label}</text>'
        f'<text x="250" y="{130 + index * 60}" font-size="22" font-family="monospace" fill="#141414">{escape(str(value))}</text>'
        f'<line x1="240" y1="{140 + index * 60}" x2="860" y2="{140 + index * 60}" stroke="#d0d0d0"/>'
        for index, (label, value) in enumerate(rows)
    )
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" font-family="Arial, sans-serif">'
        '<rect width="900" height="520" fill="#fcfbf6"/><rect width="900" height="70" fill="#284678"/>'
        f'<text x="30" y="44" font-size="24" font-weight="bold" fill="#ffffff">{escape(bank.upper())} · CASH DEPOSIT SLIP (DEMO)</text>'
        f"{lines}"
        '<ellipse cx="780" cy="455" rx="85" ry="50" fill="none" stroke="#a02828" stroke-width="4" transform="rotate(-12 780 455)"/>'
        '<text x="722" y="463" font-size="24" font-weight="bold" fill="#a02828" transform="rotate(-12 780 455)">RECEIVED</text>'
        "</svg>"
    ).encode()


def repair_demo_slips():
    import os

    from app.models import PaymentSlip, StoredFile
    from app.services.uploads import private_folder

    fixed = 0
    for slip in PaymentSlip.query.all():
        if StoredFile.query.filter_by(name=slip.file_name).first() or os.path.isfile(os.path.join(private_folder(), slip.file_name)):
            continue
        data = slip_svg(slip.bank_name, slip.reference, slip.amount, slip.paid_on, slip.student.admission_number if slip.student else "")
        db.session.add(StoredFile(name=slip.file_name, content_type="image/svg+xml", data=data))
        fixed += 1
    db.session.commit()
    return fixed


SCHOOL_STOP = {"name": "Success Academy", "lat": -1.4805, "lng": 36.9585}
DEMO_STOPS = {
    "Kitengela Town Route": [
        SCHOOL_STOP,
        {"name": "Kitengela Town Centre", "lat": -1.4746, "lng": 36.9620},
        {"name": "Kitengela Mall", "lat": -1.4705, "lng": 36.9668},
        {"name": "Muigai Inn", "lat": -1.4662, "lng": 36.9601},
        {"name": "Yukos", "lat": -1.4520, "lng": 36.9690},
        {"name": "EPZ Gate", "lat": -1.4600, "lng": 36.9750},
        {"name": "Chuna", "lat": -1.4575, "lng": 36.9860},
        {"name": "Kaputiei North", "lat": -1.4450, "lng": 36.9800},
    ],
    "Noonkopir Route": [
        SCHOOL_STOP,
        {"name": "Milimani", "lat": -1.4870, "lng": 36.9500},
        {"name": "New Valley", "lat": -1.4905, "lng": 36.9610},
        {"name": "Noonkopir", "lat": -1.4950, "lng": 36.9420},
        {"name": "Acacia", "lat": -1.5020, "lng": 36.9530},
        {"name": "Korompoi", "lat": -1.5100, "lng": 36.9655},
        {"name": "Isinya Road Junction", "lat": -1.5180, "lng": 36.9560},
        {"name": "Kisaju", "lat": -1.5600, "lng": 36.9700},
    ],
}


def add_demo_stops():
    from app.models import TransportRoute

    changed = 0
    for route in TransportRoute.query.order_by(TransportRoute.id).all():
        stops = DEMO_STOPS.get(route.name)
        if stops and len(route.stops or []) < len(stops):
            route.stops = stops
            changed += 1
        names = [stop["name"] for stop in (route.stops or [])[1:]]
        if not names:
            continue
        for index, student in enumerate(sorted(route.students, key=lambda item: item.id)):
            if not student.transport_stop or student.transport_stop not in names:
                student.transport_stop = names[index % len(names)]
                changed += 1
    db.session.commit()
    return changed
