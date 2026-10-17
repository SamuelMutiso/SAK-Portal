import hashlib
import json
from datetime import date, datetime

from flask import g, has_request_context, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from sqlalchemy import event, inspect
from sqlalchemy.orm import Session

from app.extensions import db
from app.services.devices import describe_device

WRITE_METHODS = ("POST", "PUT", "PATCH", "DELETE")
SKIP_PATHS = ("/api/auth/login", "/api/auth/refresh", "/api/payments/callback")
HIDDEN_FIELDS = ("password_hash", "allergies", "medical_conditions", "code_hash", "totp_secret", "totp_pending", "file_data")

ACTIONS = {
    "users.create_user": "Created a user account",
    "users.update_user": "Changed a user account",
    "students.create_student": "Added a learner",
    "students.update_student": "Edited a learner",
    "students.delete_student": "Marked a learner as withdrawn",
    "classes.create_class": "Created a class",
    "classes.update_class": "Edited a class",
    "clubs.create_club": "Created a club",
    "clubs.update_club": "Edited a club",
    "clubs.add_member": "Added a club member",
    "clubs.remove_member": "Removed a club member",
    "clubs.set_members": "Replaced club members",
    "clubs.add_activity": "Added a club activity",
    "clubs.set_learner_clubs": "Changed a learner's clubs",
    "students.admit": "Admitted a learner",
    "students.leave": "Recorded a learner leaving",
    "students.readmit": "Readmitted a learner",
    "school_year.update_term": "Changed term dates",
    "school_year.set_current": "Changed the current term",
    "school_year.promote": "Promoted learners to the next year",
    "clubs.delete_activity": "Deleted a club activity",
    "notices.create_notice": "Posted a notice",
    "notices.delete_notice": "Deleted a notice",
    "events.create_event": "Added a calendar event",
    "events.update_event": "Edited a calendar event",
    "events.delete_event": "Deleted a calendar event",
    "events.send_reminder": "Sent an event reminder SMS",
    "attendance.mark_attendance": "Marked the register",
    "homework.create_homework": "Set homework",
    "homework.delete_homework": "Deleted homework",
    "learning.add_material": "Posted learning material",
    "learning.delete_material": "Deleted learning material",
    "assessments.create_assessment": "Entered a grade",
    "assessments.save_grade_sheet": "Saved a grade sheet",
    "assessments.save_learner_marks": "Saved a learner's marks",
    "reports.save_report": "Edited a report card",
    "transport.create_route": "Created a bus route",
    "transport.update_route": "Edited a bus route",
    "fees.send_fee_reminders": "Sent fee reminder SMS",
    "fees.create_item": "Added a fee item",
    "fees.update_item": "Changed a fee item",
    "fees.create_rate": "Set a fee amount",
    "fees.update_rate": "Changed a fee amount",
    "fees.delete_rate": "Removed a fee amount",
    "fees.copy_structure": "Copied the fee structure to a new term",
    "fees.create_discount": "Added a discount",
    "fees.set_student_discounts": "Changed a learner's discounts",
    "fees.generate_invoices": "Generated term invoices",
    "fees.invoice_one": "Invoiced a learner",
    "fees.cancel_invoice": "Cancelled an invoice",
    "fees.record_payment": "Recorded a fee payment",
    "fees.reverse_payment": "Reversed a fee payment",
    "fees.upload_slip": "Uploaded a bank slip",
    "fees.approve_slip": "Approved a bank slip",
    "fees.reject_slip": "Rejected a bank slip",
    "paybill.assign_receipt": "Matched a Paybill payment to a learner",
    "paybill.simulate": "Simulated a Paybill payment",
    "paybill.confirmation": "M-Pesa Paybill payment received",
    "auth.change_password": "Changed their password",
    "auth.forgot_password": "Asked for a password reset code",
    "auth.reset_password": "Reset a password with an SMS code",
    "pickups.add_pickup": "Added a pick-up person",
    "pickups.remove_pickup": "Removed a pick-up person",
    "pickups.set_emergency_contact": "Changed an emergency contact",
    "trips.record_event": "Logged a bus boarding",
    "acknowledgements.acknowledge": "Marked an item as seen",
    "payments.start_payment": "Started a fee payment",
    "portfolio.add_item": "Uploaded a portfolio photo",
    "portfolio.delete_item": "Deleted a portfolio photo",
    "diary.save_diary": "Saved the daily diary",
    "leave.create_request": "Requested leave-out",
    "leave.decide": "Decided a leave-out request",
    "library.add_book": "Added a library book",
    "library.lend": "Lent a library book",
    "library.return_book": "Returned a library book",
    "timetable.set_slot": "Changed the timetable",
    "owner.update_account": "Changed an account",
    "owner.remove_account": "Removed an account",
    "owner.create_account": "Created an account",
    "consent.accept": "Accepted the Terms and Privacy Policy",
}

TABLE_NAMES = {
    "users": "User",
    "students": "Learner",
    "classrooms": "Class",
    "clubs": "Club",
    "club_activities": "Club activity",
    "notices": "Notice",
    "events": "Event",
    "attendance": "Attendance",
    "homework": "Homework",
    "learning_materials": "Learning material",
    "assessments": "Grade",
    "term_reports": "Report card",
    "transport_routes": "Bus route",
    "transport_logs": "Bus log",
    "authorized_pickups": "Pick-up person",
    "acknowledgements": "Seen receipt",
    "payments": "Payment",
    "portfolio_items": "Portfolio item",
    "diary_entries": "Diary entry",
    "leave_requests": "Leave-out request",
    "books": "Book",
    "loans": "Library loan",
    "timetable_slots": "Timetable",
    "club_members": "Club member",
    "consents": "Consent",
    "mark_changes": "Mark change",
    "school_terms": "Term",
    "student_history": "Learner history",
    "promotion_runs": "Promotion",
    "fee_items": "Fee item",
    "fee_rates": "Fee rate",
    "discounts": "Discount",
    "invoices": "Invoice",
    "invoice_lines": "Invoice line",
    "payment_slips": "Bank slip",
    "paybill_receipts": "Paybill payment",
    "password_resets": "Password reset",
    "student_discounts": "Learner discount",
}


def plain(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, (dict, list, str, int, float, bool)) or value is None:
        return value
    return str(value)


def label_for(obj):
    label = getattr(obj, "audit_label", None)
    if label:
        return label
    return f"{TABLE_NAMES.get(obj.__tablename__, obj.__tablename__)} #{obj.id}" if obj.id else TABLE_NAMES.get(obj.__tablename__, obj.__tablename__)


def record_changes(session, flush_context, instances):
    if not has_request_context():
        return
    from app.models import AuditLog

    with session.no_autoflush:
        collect_changes(session, g.setdefault("audit_changes", []), AuditLog)


def collect_changes(session, changes, AuditLog):
    for obj in session.new:
        if isinstance(obj, AuditLog):
            continue
        fields = {}
        for column in inspect(obj).mapper.column_attrs:
            value = getattr(obj, column.key)
            if column.key in HIDDEN_FIELDS:
                value = "(hidden)"
            if value is not None and column.key != "id":
                fields[column.key] = plain(value)
        changes.append({"type": "created", "table": TABLE_NAMES.get(obj.__tablename__, obj.__tablename__), "item": label_for(obj), "fields": fields})

    for obj in session.dirty:
        if isinstance(obj, AuditLog) or not session.is_modified(obj):
            continue
        state = inspect(obj)
        fields = {}
        for column in state.mapper.column_attrs:
            history = state.attrs[column.key].history
            if history.has_changes():
                old = history.deleted[0] if history.deleted else None
                new = history.added[0] if history.added else None
                if column.key in HIDDEN_FIELDS:
                    old, new = "(hidden)", "(changed)"
                if plain(old) != plain(new):
                    fields[column.key] = {"from": plain(old), "to": plain(new)}
        for relationship in state.mapper.relationships:
            if relationship.secondary is None:
                continue
            history = state.attrs[relationship.key].history
            if history.added or history.deleted:
                fields[relationship.key] = {
                    "added": [label_for(item) for item in history.added],
                    "removed": [label_for(item) for item in history.deleted],
                }
        if fields:
            changes.append({"type": "updated", "table": TABLE_NAMES.get(obj.__tablename__, obj.__tablename__), "item": label_for(obj), "fields": fields})

    for obj in session.deleted:
        if isinstance(obj, AuditLog):
            continue
        changes.append({"type": "deleted", "table": TABLE_NAMES.get(obj.__tablename__, obj.__tablename__), "item": label_for(obj), "fields": {}})


def client_ip():
    return request.remote_addr


def compute_hash(entry, previous_hash):
    payload = json.dumps(
        {
            "created_at": entry.created_at.isoformat(),
            "user_id": entry.user_id,
            "user_name": entry.user_name,
            "user_role": entry.user_role,
            "kind": entry.kind,
            "action": entry.action,
            "method": entry.method,
            "path": entry.path,
            "status": entry.status,
            "changes": entry.changes,
            "ip_address": entry.ip_address,
            "user_agent": entry.user_agent,
            "device": entry.device,
            "previous_hash": previous_hash,
        },
        sort_keys=True,
        default=str,
    )
    return hashlib.sha256(payload.encode()).hexdigest()


def write_log(kind, action, user=None, status=None, changes=None, user_name=None):
    from app.models import AuditLog

    previous = AuditLog.query.order_by(AuditLog.id.desc()).first()
    previous_hash = previous.entry_hash if previous else "start"
    agent = request.headers.get("User-Agent", "")[:400]
    entry = AuditLog(
        created_at=datetime.utcnow().replace(microsecond=0),
        user_id=user.id if user else None,
        user_name=user.full_name if user else user_name,
        user_role=user.role if user else None,
        kind=kind,
        action=action,
        method=request.method,
        path=request.path,
        status=status,
        changes=changes or [],
        ip_address=client_ip(),
        user_agent=agent,
        device=describe_device(agent),
        previous_hash=previous_hash,
    )
    entry.entry_hash = compute_hash(entry, previous_hash)
    db.session.add(entry)
    db.session.commit()
    return entry


def request_user():
    from app.models import User

    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
    except Exception:
        return None
    return db.session.get(User, int(identity)) if identity else None


def log_request(response):
    if request.method not in WRITE_METHODS or not request.path.startswith("/api/") or request.path in SKIP_PATHS:
        return response
    if response.status_code == 401 or g.get("consent_block"):
        return response

    if response.status_code >= 400:
        db.session.rollback()
    user = request_user()
    action = ACTIONS.get(request.endpoint, f"{request.method} {request.path}")
    if response.status_code == 403:
        write_log("blocked", f"Blocked: {action[0].lower()}{action[1:]}", user=user, status=403)
    elif response.status_code < 400:
        write_log("change", action, user=user, status=response.status_code, changes=g.get("audit_changes", []))
    return response


def reset_changes():
    g.audit_changes = []


def register_audit(app):
    event.listen(Session, "before_flush", record_changes)
    app.before_request(reset_changes)
    app.after_request(log_request)
