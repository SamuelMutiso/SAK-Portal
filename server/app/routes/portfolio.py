from flask import Blueprint, current_app, jsonify, request, send_from_directory
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import PortfolioItem
from app.schemas import PortfolioSchema
from app.services.uploads import save_image
from app.utils.roles import current_user, roles_required, viewable_student

portfolio_bp = Blueprint("portfolio", __name__, url_prefix="/api")
schema = PortfolioSchema()


@portfolio_bp.get("/portfolio/student/<int:student_id>")
@jwt_required()
def list_items(student_id):
    viewable_student(student_id)
    items = PortfolioItem.query.filter_by(student_id=student_id).order_by(PortfolioItem.created_at.desc()).all()
    return jsonify(schema.dump(items, many=True))


@portfolio_bp.post("/portfolio")
@roles_required("admin", "teacher")
def add_item():
    student = viewable_student(request.form.get("student_id", type=int))
    if student.parent and student.parent.photo_consent is False:
        return jsonify(error=f"{student.first_name}'s parent has not allowed photos in the portfolio"), 403
    title = request.form.get("title", "").strip()
    learning_area = request.form.get("learning_area", "").strip()
    image = request.files.get("image")
    if not title or not learning_area or not image:
        return jsonify(error="Add a title, learning area and photo"), 400
    try:
        name = save_image(image)
    except ValueError as error:
        return jsonify(error=str(error)), 400

    item = PortfolioItem(
        student_id=student.id,
        title=title,
        learning_area=learning_area,
        description=request.form.get("description"),
        image_url=f"/api/uploads/{name}",
        teacher_id=current_user().id,
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(schema.dump(item)), 201


@portfolio_bp.delete("/portfolio/<int:item_id>")
@roles_required("admin", "teacher")
def delete_item(item_id):
    item = db.get_or_404(PortfolioItem, item_id)
    viewable_student(item.student_id)
    db.session.delete(item)
    db.session.commit()
    return "", 204


@portfolio_bp.get("/uploads/<path:name>")
def uploaded_file(name):
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], name)
