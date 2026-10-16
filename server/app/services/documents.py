from app.services.school_year import this_year

SCHOOL = {
    "name": "Success Academy Kitengela",
    "motto": "In pursuit of excellence",
    "address": "Kitengela, Kajiado County",
    "phone": "0748 065 956",
    "curriculum": "Competency Based Curriculum (CBC)",
}

STAGES = (
    ("pp2", "PP2", "Pre-Primary Education", "Grade 1"),
    ("grade6", "Grade 6", "Primary School", "Junior School"),
    ("grade9", "Grade 9", "Junior School", "Senior School"),
)


def completions(student):
    found = []
    current = student.classroom.name if student.classroom and student.status == "active" else None
    for key, classroom, stage, next_stage in STAGES:
        if current == classroom:
            found.append({"key": key, "class": classroom, "stage": stage, "next": next_stage, "year": this_year(), "upcoming": True})
            continue
        past = [entry for entry in student.history if entry.classroom_name == classroom and entry.outcome in ("promoted", "completed")]
        if past:
            found.append({"key": key, "class": classroom, "stage": stage, "next": next_stage, "year": past[-1].year, "upcoming": False})
    return found


def documents_for(student):
    classroom = student.classroom.name if student.classroom else student.last_classroom_name
    return {
        "school": SCHOOL,
        "year": this_year(),
        "student": {
            "id": student.id, "first_name": student.first_name, "last_name": student.last_name, "full_name": student.full_name,
            "gender": student.gender, "admission_number": student.admission_number, "upi": student.upi,
            "assessment_number": student.assessment_number, "classroom_name": classroom,
            "level": student.classroom.level if student.classroom else None, "is_boarder": student.is_boarder,
            "date_of_birth": student.date_of_birth.isoformat() if student.date_of_birth else None,
            "admission_date": student.admission_date.isoformat() if student.admission_date else None,
            "left_on": student.left_on.isoformat() if student.left_on else None, "leaving_reason": student.leaving_reason,
            "status": student.status, "previous_school": student.previous_school,
            "parent_name": student.parent.full_name if student.parent else None,
            "parent_phone": student.parent.phone if student.parent else None,
            "route_name": student.transport_route.name if student.transport_route else None,
        },
        "completions": completions(student),
        "can_leave_certificate": student.status != "active",
    }
