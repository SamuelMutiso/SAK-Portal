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
