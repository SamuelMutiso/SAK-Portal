from io import BytesIO

from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import jwt_required

from app.curriculum import LEARNING_AREAS
from app.extensions import db, limiter
from app.models import Classroom, LearningMaterial
from app.schemas.learning import MaterialSchema
from app.services.uploads import DOCUMENTS, looks_like
from app.utils.roles import current_user, roles_required, viewable_student

learning_bp = Blueprint("learning", __name__, url_prefix="/api/learning")
schema = MaterialSchema()
READERS = ("admin", "director", "exams")
FILE_TYPES = {"pdf": "application/pdf", "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}


def allowed_classroom(user, material=None, classroom_id=None):
    classroom_id = material.classroom_id if material else classroom_id
    if user.role in READERS:
        return True
    if user.role == "teacher":
        return user.classroom is not None and user.classroom.id == classroom_id
    if user.role == "parent":
        return any(child.classroom_id == classroom_id and child.status == "active" for child in user.children)
    return False


@learning_bp.get("/materials")
@jwt_required()
def list_materials():
    user = current_user()
    if user.role not in READERS + ("teacher", "parent"):
        return jsonify(error="You do not have access to this"), 403
    student_id = request.args.get("student_id", type=int)
    if student_id:
        classroom_id = viewable_student(student_id).classroom_id
    elif user.role == "teacher":
        classroom_id = user.classroom.id if user.classroom else None
    else:
        classroom_id = request.args.get("classroom_id", type=int)
    if not classroom_id and user.role not in READERS:
        return jsonify([])
    if classroom_id and not allowed_classroom(user, classroom_id=classroom_id):
        return jsonify(error="You do not have access to this"), 403
    query = LearningMaterial.query
    if classroom_id:
        query = query.filter_by(classroom_id=classroom_id)
    subject = request.args.get("subject")
    if subject:
        query = query.filter_by(subject=subject)
    return jsonify(schema.dump(query.order_by(LearningMaterial.created_at.desc()).limit(200).all(), many=True))


def read_upload():
    upload = request.files.get("file")
    if not upload or not upload.filename:
        return None, "Choose a PDF or photo to upload"
    extension = upload.filename.rsplit(".", 1)[-1].lower() if "." in upload.filename else ""
    if extension not in DOCUMENTS or not looks_like(upload, extension):
        return None, "Upload a PDF or a photo (JPG, PNG, WEBP)"
    data = upload.read()
    if not data:
        return None, "That file is empty"
    name = upload.filename.replace("\\", "/").rsplit("/", 1)[-1][:150]
    return (name, FILE_TYPES[extension], data), None


@learning_bp.post("/materials")
@limiter.limit("60 per hour")
@roles_required("admin", "teacher")
def add_material():
    user = current_user()
    payload = request.form.to_dict() if request.files or request.form else (request.get_json() or {})
    payload = {key: (value.strip() if isinstance(value, str) else value) or None for key, value in payload.items() if key in schema.fields}
    data = schema.load(payload)
    classroom = db.get_or_404(Classroom, data["classroom_id"])
    if not allowed_classroom(user, classroom_id=classroom.id):
        return jsonify(error="Teachers can only post materials for their own class"), 403
    if data["subject"] not in LEARNING_AREAS.get(classroom.level, []):
        return jsonify(error=f"{data['subject']} is not a learning area for {classroom.name}"), 400
    material = LearningMaterial(**data, teacher_id=user.id)
    if data["kind"] == "notes" and not data.get("body"):
        return jsonify(error="Write the notes"), 400
    if data["kind"] in ("link", "video") and not data.get("link_url"):
        return jsonify(error="Paste the link, starting with https://"), 400
    if data["kind"] == "file":
        upload, problem = read_upload()
        if problem:
            return jsonify(error=problem), 400
        material.file_name, material.file_type, material.file_data = upload
        material.file_size = len(upload[2])
        material.link_url = None
    db.session.add(material)
    db.session.commit()
    return jsonify(schema.dump(material)), 201


@learning_bp.get("/materials/<int:material_id>/file")
@jwt_required()
def material_file(material_id):
    material = db.get_or_404(LearningMaterial, material_id)
    if not allowed_classroom(current_user(), material) or not material.file_data:
        return jsonify(error="Not found"), 404
    response = send_file(BytesIO(material.file_data), mimetype=material.file_type, download_name=material.file_name or "material")
    response.headers["Cache-Control"] = "private, no-store"
    return response


@learning_bp.delete("/materials/<int:material_id>")
@roles_required("admin", "teacher")
def delete_material(material_id):
    user = current_user()
    material = db.get_or_404(LearningMaterial, material_id)
    if user.role == "teacher" and material.teacher_id != user.id:
        return jsonify(error="You can only delete materials you posted"), 403
    db.session.delete(material)
    db.session.commit()
    return "", 204
