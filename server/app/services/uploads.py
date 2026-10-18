import os
import uuid
from io import BytesIO

from flask import abort, current_app, send_file, send_from_directory

ALLOWED = {"jpg", "jpeg", "png", "webp"}

DOCUMENTS = {"jpg", "jpeg", "png", "webp", "pdf"}

SIGNATURES = {
    "jpg": (b"\xff\xd8\xff",),
    "jpeg": (b"\xff\xd8\xff",),
    "png": (b"\x89PNG\r\n\x1a\n",),
    "pdf": (b"%PDF-",),
}

CONTENT_TYPES = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp", "pdf": "application/pdf", "svg": "image/svg+xml"}


def looks_like(file, extension):
    head = file.stream.read(16)
    file.stream.seek(0)
    if extension == "webp":
        return head[:4] == b"RIFF" and head[8:12] == b"WEBP"
    return any(head.startswith(magic) for magic in SIGNATURES.get(extension, ()))


def private_folder():
    return os.path.join(os.path.dirname(current_app.config["UPLOAD_FOLDER"].rstrip("/")), "private")


def store_bytes(data, extension):
    from app.extensions import db
    from app.models import StoredFile

    name = f"{uuid.uuid4().hex}.{extension}"
    db.session.add(StoredFile(name=name, content_type=CONTENT_TYPES[extension], data=data))
    return name


def store(file, allowed, message):
    extension = file.filename.rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
    if extension not in allowed or not looks_like(file, extension):
        raise ValueError(message)
    data = file.read()
    if not data:
        raise ValueError("That file is empty")
    return store_bytes(data, extension)


def save_private(file):
    return store(file, DOCUMENTS, "Upload a photo (JPG, PNG) or a PDF of the slip")


def save_image(file):
    return store(file, ALLOWED, "Upload a JPG, PNG or WEBP image")


def send_stored(name, folder):
    from app.models import StoredFile

    row = StoredFile.query.filter_by(name=name).first()
    if row:
        return send_file(BytesIO(row.data), mimetype=row.content_type, download_name=name)
    if name and os.path.isfile(os.path.join(folder, name)):
        return send_from_directory(folder, name)
    abort(404)
