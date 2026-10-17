import re
from datetime import date, timedelta

from app.curriculum import current_term
from app.extensions import db
from app.models import Attendance, Classroom, Event, Invoice, LeaveRequest, Notice, Payment, SchoolTerm, Student, User
from app.services.insights import class_insights, student_insights

FEE_ROLES = ("director", "admin", "bursar")
SCHOOL_ROLES = ("director", "admin")


class Masker:
    def __init__(self):
        self.tokens = {}
        self.names = {}
        self.keys = {}

    def token(self, kind, key, name):
        if (kind, key) not in self.tokens:
            token = f"[{kind}{len([item for item in self.tokens if item[0] == kind]) + 1}]"
            self.tokens[(kind, key)] = token
            self.names[token] = name
            self.keys[token] = key
        return self.tokens[(kind, key)]

    def learner(self, student):
        return self.token("L", student.id, student.full_name)

    def teacher(self, user):
        return self.token("T", user.id, user.full_name) if user else None

    def hide_names(self, text):
        people = [(student, f"{student.first_name} {student.last_name}", f"{student.last_name} {student.first_name}") for student in Student.query.all()]
        for student, *spellings in sorted(people, key=lambda item: -len(item[1])):
            for spelling in spellings:
                pattern = re.compile(rf"\b{re.escape(spelling)}\b", re.IGNORECASE)
                if pattern.search(text):
                    text = pattern.sub(self.learner(student), text)
            pattern = re.compile(rf"\b{re.escape(student.admission_number)}\b", re.IGNORECASE)
            if pattern.search(text):
                text = pattern.sub(self.learner(student), text)
        for user in User.query.filter(User.role.in_(("teacher", "director", "admin", "bursar", "exams"))).all():
            if len(user.full_name.split()) > 1:
                pattern = re.compile(rf"\b{re.escape(user.full_name)}\b", re.IGNORECASE)
                if pattern.search(text):
                    text = pattern.sub(self.teacher(user), text)
        return text

    def show_names(self, text):
        return re.sub(r"\[[LT]\d+\]", lambda match: self.names.get(match.group(0), match.group(0)), text)


def percent(part, whole):
    return round(part / whole * 100, 1) if whole else None


def find_class(name):
    if not name:
        return None
    wanted = re.sub(r"\s+", " ", name.strip().lower())
    for classroom in Classroom.query.all():
        if classroom.name.lower() == wanted or classroom.name.lower().replace("grade ", "") == wanted.replace("grade ", ""):
            return classroom
    return False


def unknown_class(name):
    return {"error": f"There is no class called {name}.", "classes": [item.name for item in Classroom.query.order_by(Classroom.sort_order, Classroom.id)]}


def term_dates(name):
    term = SchoolTerm.query.filter_by(name=name).first()
    return (term.start_date, term.end_date) if term else (None, None)


def school_overview(user, masker):
    today = date.today()
    active = Student.query.filter_by(status="active")
    classes = Classroom.query.order_by(Classroom.sort_order, Classroom.id).all()
    marked = Attendance.query.filter_by(date=today).all()
    result = {
        "today": today.isoformat(),
        "current_term": current_term(),
        "learners": active.count(),
        "boarders": active.filter_by(is_boarder=True).count(),
        "learners_per_class": {classroom.name: sum(1 for student in classroom.students if student.status == "active") for classroom in classes},
        "fees_outstanding_kes": sum(max(student.fee_balance or 0, 0) for student in active),
    }
    if user.role in SCHOOL_ROLES:
        result.update({
            "teachers": User.query.filter_by(role="teacher", is_active=True).count(),
            "class_teachers": {classroom.name: masker.teacher(classroom.teacher) for classroom in classes},
            "attendance_today": {"marked": len(marked), "present": sum(1 for record in marked if record.status != "absent"), "late": sum(1 for record in marked if record.status == "late")},
            "leave_requests_waiting": LeaveRequest.query.filter_by(status="pending").count(),
        })
    return result


def attendance_report(user, masker, days=7, class_name=None):
    days = max(1, min(int(days or 7), 120))
    classroom = find_class(class_name)
    if classroom is False:
        return unknown_class(class_name)
    end = date.today()
    start = end - timedelta(days=days - 1)
    query = Attendance.query.filter(Attendance.date >= start, Attendance.date <= end)
    if classroom:
        query = query.join(Student).filter(Student.classroom_id == classroom.id)
    records = query.all()
    if not records:
        return {"from": start.isoformat(), "to": end.isoformat(), "note": "No attendance was marked in this period."}
    per_class, per_day, absences = {}, {}, {}
    for record in records:
        student = record.student
        name = student.classroom.name if student.classroom else "No class"
        here = record.status != "absent"
        per_class.setdefault(name, [0, 0])
        per_class[name][0] += here
        per_class[name][1] += 1
        per_day.setdefault(record.date, [0, 0])
        per_day[record.date][0] += here
        per_day[record.date][1] += 1
        if not here:
            absences[student] = absences.get(student, 0) + 1
    present = sum(item[0] for item in per_class.values())
    worst = sorted(absences.items(), key=lambda item: -item[1])[:10]
    return {
        "from": start.isoformat(),
        "to": end.isoformat(),
        "class": classroom.name if classroom else "whole school",
        "school_days_marked": len(per_day),
        "attendance_rate_percent": percent(present, len(records)),
        "rate_by_class_percent": dict(sorted(((name, percent(*counts)) for name, counts in per_class.items()), key=lambda item: item[1])),
        "rate_by_day_percent": {day.isoformat(): percent(*counts) for day, counts in sorted(per_day.items())},
        "most_absent_learners": [{"learner": masker.learner(student), "class": student.classroom.name if student.classroom else None, "days_absent": count} for student, count in worst],
    }


def fees_report(user, masker, term=None, class_name=None):
    term = term or current_term()
    classroom = find_class(class_name)
    if classroom is False:
        return unknown_class(class_name)
    invoices = Invoice.query.filter(Invoice.term == term, Invoice.status != "cancelled")
    students = Student.query.filter_by(status="active")
    if classroom:
        invoices = invoices.join(Student).filter(Student.classroom_id == classroom.id)
        students = students.filter_by(classroom_id=classroom.id)
    invoices = invoices.all()
    students = students.all()
    billed = sum(invoice.total for invoice in invoices)
    paid = sum(invoice.paid_amount for invoice in invoices)
    by_class = {}
    for invoice in invoices:
        name = invoice.student.classroom.name if invoice.student.classroom else "No class"
        by_class.setdefault(name, [0, 0])
        by_class[name][0] += invoice.paid_amount
        by_class[name][1] += invoice.total
    owing = sorted((student for student in students if (student.fee_balance or 0) > 0), key=lambda student: -student.fee_balance)
    return {
        "term": term,
        "class": classroom.name if classroom else "whole school",
        "billed_kes": billed,
        "paid_against_invoices_kes": paid,
        "unpaid_on_invoices_kes": billed - paid,
        "collection_rate_percent": percent(paid, billed),
        "collection_rate_by_class_percent": dict(sorted(((name, percent(*counts)) for name, counts in by_class.items()), key=lambda item: item[1] or 0)),
        "learners_with_balance": len(owing),
        "learners_fully_paid": sum(1 for student in students if (student.fee_balance or 0) <= 0),
        "total_balances_kes": sum(student.fee_balance for student in owing),
        "largest_balances": [{"learner": masker.learner(student), "class": student.classroom.name if student.classroom else None, "balance_kes": student.fee_balance} for student in owing[:10]],
    }


def payments_report(user, masker, days=7, start_date=None, end_date=None):
    try:
        end = date.fromisoformat(end_date) if end_date else date.today()
        start = date.fromisoformat(start_date) if start_date else end - timedelta(days=max(1, min(int(days or 7), 366)) - 1)
    except ValueError:
        return {"error": "Dates must look like 2026-10-17."}
    if (end - start).days > 366:
        start = end - timedelta(days=366)
    payments = [payment for payment in Payment.query.filter_by(status="completed").all()
                if start <= (payment.paid_on or payment.created_at.date()) <= end]
    by_method, by_day = {}, {}
    for payment in payments:
        day = payment.paid_on or payment.created_at.date()
        by_method[payment.method or "Other"] = by_method.get(payment.method or "Other", 0) + payment.amount
        by_day[day] = by_day.get(day, 0) + payment.amount
    largest = sorted(payments, key=lambda payment: -payment.amount)[:5]
    return {
        "from": start.isoformat(),
        "to": end.isoformat(),
        "payments": len(payments),
        "total_kes": sum(payment.amount for payment in payments),
        "by_method_kes": by_method,
        "by_day_kes": {day.isoformat(): amount for day, amount in sorted(by_day.items())},
        "largest_payments": [{"learner": masker.learner(payment.student), "amount_kes": payment.amount, "method": payment.method,
                              "date": (payment.paid_on or payment.created_at.date()).isoformat()} for payment in largest],
    }


def class_summary(masker, classroom, term=None, exam=None):
    data = class_insights(classroom, term, exam)
    if data.get("empty"):
        return {"class": classroom.name, "note": "No marks entered yet."}
    pick = lambda items: [{"learner": masker.learner(db.session.get(Student, item["id"])), "mean": item["mean"], "change": item["change"]} for item in items]
    return {
        "class": classroom.name,
        "class_teacher": masker.teacher(classroom.teacher),
        "exam": data["label"],
        "scale": "percent marks" if data["scale"] == "marks" else "CBC level points out of 4",
        "class_mean": data["exam_mean"],
        "level": data["exam_grade"],
        "previous_exam": data["previous_label"],
        "previous_mean": data["previous_mean"],
        "learning_areas": {item["subject"]: item["mean"] for item in data["subjects"]},
        "level_counts": data["distribution"],
        "learners_needing_attention": len(data["needs_attention"]),
        "top_learners": pick(data["top"][:3]),
        "most_improved": pick(data["most_improved"][:3]),
        "biggest_drops": pick(data["declined"][:3]),
    }


def performance_report(user, masker, class_name=None, term=None, exam=None):
    if user.role not in SCHOOL_ROLES:
        return {"error": "Marks are not part of your account."}
    classroom = find_class(class_name)
    if classroom is False:
        return unknown_class(class_name)
    if classroom:
        return class_summary(masker, classroom, term, exam)
    classes = []
    for item in Classroom.query.order_by(Classroom.sort_order, Classroom.id).all():
        data = class_insights(item, term, exam)
        if not data.get("empty"):
            classes.append({"class": item.name, "exam": data["label"], "scale": "percent" if data["scale"] == "marks" else "points out of 4",
                            "mean": data["exam_mean"], "level": data["exam_grade"], "previous_mean": data["previous_mean"],
                            "weakest_area": data["weakest_subjects"][0]["subject"] if data["weakest_subjects"] else None,
                            "learners_needing_attention": len(data["needs_attention"])})
    return {"note": "Grade 4 to 9 use percent marks; PP1 to Grade 3 use CBC level points out of 4, so only compare classes on the same scale.", "classes": classes}


def learner_lookup(user, masker, name):
    text = (name or "").strip()
    found = [db.session.get(Student, masker.keys[text])] if text.startswith("[L") and text in masker.keys else []
    if not found:
        query = Student.query
        for word in text.replace("[", "").replace("]", "").split()[:3]:
            query = query.filter(Student.first_name.ilike(f"%{word}%") | Student.last_name.ilike(f"%{word}%") | Student.admission_number.ilike(f"%{word}%"))
        found = query.limit(6).all() if text else []
    if not found:
        return {"error": "No learner matches that name."}
    if len(found) > 1:
        return {"several_matches": [{"learner": masker.learner(student), "class": student.classroom.name if student.classroom else student.last_classroom_name,
                                     "status": student.status} for student in found],
                "note": "Ask which one they mean."}
    student = found[0]
    term = current_term()
    start, end = term_dates(term)
    records = [record for record in student.attendance if (not start or record.date >= start) and (not end or record.date <= end)]
    result = {
        "learner": masker.learner(student),
        "class": student.classroom.name if student.classroom else student.last_classroom_name,
        "status": student.status,
        "boarder": bool(student.is_boarder),
        "fee_balance_kes": student.fee_balance,
        "recent_payments": [{"amount_kes": payment.amount, "method": payment.method, "date": (payment.paid_on or payment.created_at.date()).isoformat()}
                            for payment in sorted((item for item in student.payments if item.status == "completed"), key=lambda item: item.id)[-3:]],
    }
    if user.role in SCHOOL_ROLES:
        insight = student_insights(student)
        result.update({
            "attendance_this_term": {"days_marked": len(records), "absent": sum(1 for record in records if record.status == "absent"),
                                     "late": sum(1 for record in records if record.status == "late")},
            "latest_results": None if insight.get("empty") else {"exam": insight["label"], "mean": insight["mean"], "level": insight["grade"],
                                                                 "change": insight["change"], "position": insight["position"], "class_size": insight["class_size"],
                                                                 "strengths": [item["subject"] for item in insight["strengths"]],
                                                                 "needs_improvement": [item["subject"] for item in insight["needs_improvement"]]},
        })
    return result


def notices_and_events(user, masker, days_ahead=30):
    today = date.today()
    days_ahead = max(1, min(int(days_ahead or 30), 180))
    events = Event.query.filter(Event.start_date >= today, Event.start_date <= today + timedelta(days=days_ahead)).order_by(Event.start_date).limit(15).all()
    notices = Notice.query.order_by(Notice.created_at.desc()).limit(8).all()
    return {
        "today": today.isoformat(),
        "upcoming_events": [{"title": event.title, "date": event.start_date.isoformat(), "ends": event.end_date.isoformat() if event.end_date else None,
                             "category": event.category, "place": event.location} for event in events],
        "latest_notices": [{"title": notice.title, "sent": notice.created_at.date().isoformat(), "to": notice.audience,
                            "summary": notice.body[:300]} for notice in notices],
    }


def schema(name, description, properties=None):
    return {"type": "function", "function": {"name": name, "description": description,
                                             "parameters": {"type": "object", "properties": properties or {}, "additionalProperties": False}}}


CLASS = {"type": "string", "description": "Class name such as 'Grade 5' or 'PP2'. Leave out for the whole school."}
TERM = {"type": "string", "description": "Term such as 'Term 3 2026'. Leave out for the current term."}

TOOLS = {
    "school_overview": (school_overview, FEE_ROLES, schema("school_overview", "Today's date, current term, number of learners per class, boarders, total fee balances, and for office staff attendance today and class teachers.")),
    "attendance_report": (attendance_report, SCHOOL_ROLES, schema("attendance_report", "Attendance rates by class and by day, and the learners absent most, over the last N days.", {
        "days": {"type": "integer", "description": "How many days back, 1 to 120. 7 is a week, 30 is a month."}, "class_name": CLASS})),
    "fees_report": (fees_report, FEE_ROLES, schema("fees_report", "Fees billed and paid for a term, collection rate by class, how many learners owe, and the largest balances.", {
        "term": TERM, "class_name": CLASS})),
    "payments_report": (payments_report, FEE_ROLES, schema("payments_report", "Money received: totals by method (M-Pesa, Paybill, Bank, Cash) and by day, for the last N days or between two dates.", {
        "days": {"type": "integer", "description": "How many days back. 1 is today only."},
        "start_date": {"type": "string", "description": "First day, YYYY-MM-DD."}, "end_date": {"type": "string", "description": "Last day, YYYY-MM-DD."}})),
    "performance_report": (performance_report, SCHOOL_ROLES, schema("performance_report", "Exam results. With a class: class mean, learning area means, top learners, most improved, biggest drops. Without a class: every class's mean side by side.", {
        "class_name": CLASS, "term": TERM, "exam": {"type": "string", "enum": ["Opener", "Mid-Term", "End-Term"]}})),
    "learner_lookup": (learner_lookup, FEE_ROLES, schema("learner_lookup", "One learner's class, fee balance, recent payments, and for office staff attendance this term and latest results.", {
        "name": {"type": "string", "description": "The learner's token such as [L1], or part of their name or admission number."}})),
    "notices_and_events": (notices_and_events, FEE_ROLES, schema("notices_and_events", "Upcoming school calendar events and the latest notices sent to parents.", {
        "days_ahead": {"type": "integer", "description": "How many days ahead to look for events."}})),
}


def tools_for(role):
    return [item[2] for item in TOOLS.values() if role in item[1]]


def run_tool(user, masker, name, arguments):
    entry = TOOLS.get(name)
    if not entry or user.role not in entry[1]:
        return {"error": "That report is not available."}
    allowed = entry[2]["function"]["parameters"]["properties"]
    try:
        return entry[0](user, masker, **{key: value for key, value in (arguments or {}).items() if key in allowed and value not in (None, "")})
    except (TypeError, ValueError):
        return {"error": "Those details were not understood."}
