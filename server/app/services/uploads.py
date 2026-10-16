import os
import uuid

from flask import current_app

ALLOWED = {"jpg", "jpeg", "png", "webp"}


DOCUMENTS = {"jpg", "jpeg", "png", "webp", "pdf"}

SIGNATURES = {
    "jpg": (b"\xff\xd8\xff",),
    "jpeg": (b"\xff\xd8\xff",),
    "png": (b"\x89PNG\r\n\x1a\n",),
    "pdf": (b"%PDF-",),
}


def looks_like(file, extension):
    head = file.stream.read(16)
    file.stream.seek(0)
    if extension == "webp":
        return head[:4] == b"RIFF" and head[8:12] == b"WEBP"
    return any(head.startswith(magic) for magic in SIGNATURES.get(extension, ()))


def private_folder():
    return os.path.join(os.path.dirname(current_app.config["UPLOAD_FOLDER"].rstrip("/")), "private")


def save_private(file):
    extension = file.filename.rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
    if extension not in DOCUMENTS or not looks_like(file, extension):
        raise ValueError("Upload a photo (JPG, PNG) or a PDF of the slip")
    folder = private_folder()
    os.makedirs(folder, exist_ok=True)
    name = f"{uuid.uuid4().hex}.{extension}"
    file.save(os.path.join(folder, name))
    return name


def save_image(file):
    extension = file.filename.rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
    if extension not in ALLOWED or not looks_like(file, extension):
        raise ValueError("Upload a JPG, PNG or WEBP image")
    folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(folder, exist_ok=True)
    name = f"{uuid.uuid4().hex}.{extension}"
    file.save(os.path.join(folder, name))
    return name
