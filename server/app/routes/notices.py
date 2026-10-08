from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import or_

from app.extensions import db
from app.models import Club, Notice, Student, User
from app.schemas import NoticeSchema
from app.routes.acknowledgements import seen_counts
from app.services.sms import send_sms
from app.utils.roles import current_user, roles_required

notices_bp = Blueprint("notices", __name__, url_prefix="/api/notices")
schema = NoticeSchema()


def recipients_for(notice):
    query = Student.query
    if notice.audience == "class":
        query = query.filter(Student.classroom_id == notice.classroom_id)
    elif notice.audience == "club":
        query = query.filter(Student.clubs.any(Club.id == notice.club_id))
    elif notice.audience == "route":
        query = query.filter(Student.transport_route_id == notice.transport_route_id)
    elif notice.audience == "boarders":
        query = query.filter(Student.is_boarder.is_(True))
    parent_ids = {student.parent_id for student in query.all() if student.parent_id}
    return User.query.filter(User.id.in_(parent_ids), User.is_active.is_(True)).all()


def notices_for_parent(user):
    children = user.children
    class_ids = {child.classroom_id for child in children}
    club_ids = {club.id for child in children for club in child.clubs}
    route_ids = {child.transport_route_id for child in children}
    has_boarder = any(child.is_boarder for child in children)
    filters = [
        Notice.audience == "all",
        (Notice.audience == "class") & Notice.classroom_id.in_(class_ids),
        (Notice.audience == "club") & Notice.club_id.in_(club_ids),
        (Notice.audience == "route") & Notice.transport_route_id.in_(route_ids),
    ]
    if has_boarder:
        filters.append(Notice.audience == "boarders")
    return Notice.query.filter(or_(*filters))


@notices_bp.get("")
@jwt_required()
def list_notices():
    user = current_user()
    query = notices_for_parent(user) if user.role == "parent" else Notice.query
    notices = query.order_by(Notice.created_at.desc()).limit(100).all()
    data = schema.dump(notices, many=True)
    if user.role != "parent":
        counts = seen_counts("notice", [notice.id for notice in notices])
        for item, notice in zip(data, notices):
            item["seen_count"] = counts.get(notice.id, 0)
            item["recipient_count"] = len(recipients_for(notice))
    return jsonify(data)


@notices_bp.post("")
@roles_required("admin", "teacher")
def create_notice():
    user = current_user()
    data = schema.load(request.get_json() or {})
    if user.role == "teacher":
        own_class = user.classroom.id if user.classroom else None
        if data["audience"] != "class" or data.get("classroom_id") != own_class:
            return jsonify(error="Teachers can only post to their own class"), 403

    notice = Notice(**data, author_id=user.id)
    db.session.add(notice)
    db.session.flush()

    sms = {"sent": 0, "mode": "none", "recipients": []}
    if notice.send_sms:
        parents = recipients_for(notice)
        message = f"Success Academy: {notice.title}. {notice.body}"
        sms = send_sms([parent.phone for parent in parents], message)
        sms["message"] = message
        notice.sms_count = sms["sent"]

    db.session.commit()
    return jsonify(notice=schema.dump(notice), sms=sms), 201


@notices_bp.delete("/<int:notice_id>")
@roles_required("admin")
def delete_notice(notice_id):
    notice = db.get_or_404(Notice, notice_id)
    db.session.delete(notice)
    db.session.commit()
    return "", 204
