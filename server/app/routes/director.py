from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request
from sqlalchemy import func, or_

from app.extensions import db
from app.models import AuditLog, User
from app.models.user import STAFF_ROLES
from app.schemas import UserSchema
from app.services.audit import compute_hash
from app.services.geo import locate
from app.utils.roles import current_user, roles_required

director_bp = Blueprint("director", __name__, url_prefix="/api/director")

KINDS = ("change", "login", "login_failed", "blocked")


def log_dump(entry):
    return {
        "id": entry.id,
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
        "location": locate(entry.ip_address),
        "device": entry.device,
        "user_agent": entry.user_agent,
        "entry_hash": entry.entry_hash,
    }


def verify_chain():
    previous_hash = "start"
    checked = 0
    for entry in AuditLog.query.order_by(AuditLog.id).yield_per(500):
        if entry.previous_hash != previous_hash or compute_hash(entry, previous_hash) != entry.entry_hash:
            return {"ok": False, "checked": checked, "broken_at": entry.id, "broken_time": entry.created_at.isoformat()}
        previous_hash = entry.entry_hash
        checked += 1
    return {"ok": True, "checked": checked}


@director_bp.get("/audit")
@roles_required("superadmin")
def audit_trail():
    query = AuditLog.query
    kind = request.args.get("kind")
    if kind in KINDS:
        query = query.filter(AuditLog.kind == kind)
    user_id = request.args.get("user_id", type=int)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    role = request.args.get("role")
    if role:
        query = query.filter(AuditLog.user_role == role)
    search = request.args.get("search", "").strip()
    if search:
        pattern = f"%{search}%"
        query = query.filter(or_(
            AuditLog.action.ilike(pattern),
            AuditLog.user_name.ilike(pattern),
            AuditLog.ip_address.ilike(pattern),
            func.cast(AuditLog.changes, db.String).ilike(pattern),
        ))
    start = request.args.get("from")
    if start:
        query = query.filter(AuditLog.created_at >= datetime.fromisoformat(start))
    end = request.args.get("to")
    if end:
        query = query.filter(AuditLog.created_at < datetime.fromisoformat(end) + timedelta(days=1))

    page = max(request.args.get("page", 1, type=int), 1)
    total = query.count()
    entries = query.order_by(AuditLog.id.desc()).offset((page - 1) * 50).limit(50).all()
    return jsonify(total=total, page=page, pages=max((total + 49) // 50, 1), entries=[log_dump(entry) for entry in entries])


@director_bp.get("/overview")
@roles_required("superadmin")
def overview():
    since = datetime.utcnow() - timedelta(days=7)
    recent = AuditLog.query.filter(AuditLog.created_at >= since)
    active = (
        db.session.query(AuditLog.user_name, AuditLog.user_role, func.count(AuditLog.id))
        .filter(AuditLog.created_at >= since, AuditLog.kind == "change", AuditLog.user_id.isnot(None))
        .group_by(AuditLog.user_name, AuditLog.user_role)
        .order_by(func.count(AuditLog.id).desc())
        .limit(5)
        .all()
    )
    failed = (
        db.session.query(AuditLog.user_name, AuditLog.ip_address, func.count(AuditLog.id))
        .filter(AuditLog.created_at >= since, AuditLog.kind == "login_failed")
        .group_by(AuditLog.user_name, AuditLog.ip_address)
        .order_by(func.count(AuditLog.id).desc())
        .limit(5)
        .all()
    )
    latest = recent.filter(AuditLog.kind.in_(("change", "blocked"))).order_by(AuditLog.id.desc()).limit(8).all()
    return jsonify(
        integrity=verify_chain(),
        counts={kind: recent.filter(AuditLog.kind == kind).count() for kind in KINDS},
        most_active=[{"name": name, "role": role, "count": count} for name, role, count in active],
        failed_logins=[{"name": name, "ip": ip, "location": locate(ip), "count": count} for name, ip, count in failed],
        latest=[log_dump(entry) for entry in latest],
        staff=User.query.filter(User.role.in_(STAFF_ROLES)).count(),
    )


@director_bp.get("/verify")
@roles_required("superadmin")
def verify():
    return jsonify(verify_chain())


@director_bp.get("/staff")
@roles_required("superadmin")
def staff():
    users = User.query.filter(User.role.in_(STAFF_ROLES + ("superadmin",))).order_by(User.role, User.full_name).all()
    last_seen = dict(
        db.session.query(AuditLog.user_id, func.max(AuditLog.created_at))
        .filter(AuditLog.kind == "login")
        .group_by(AuditLog.user_id)
        .all()
    )
    rows = []
    for user in users:
        row = UserSchema().dump(user)
        row["last_login"] = last_seen.get(user.id).isoformat() if last_seen.get(user.id) else None
        rows.append(row)
    return jsonify(rows)


@director_bp.patch("/staff/<int:user_id>")
@roles_required("superadmin")
def update_staff(user_id):
    user = db.get_or_404(User, user_id)
    if user.id == current_user().id:
        return jsonify(error="You cannot change your own director account here"), 400
    data = request.get_json() or {}
    if "is_active" in data:
        user.is_active = bool(data["is_active"])
    if data.get("role") in STAFF_ROLES:
        user.role = data["role"]
    if data.get("password"):
        if len(data["password"]) < 8:
            return jsonify(error="Passwords need at least 8 characters"), 400
        user.set_password(data["password"])
    db.session.commit()
    return jsonify(UserSchema().dump(user))
