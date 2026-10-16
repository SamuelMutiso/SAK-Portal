import os
import uuid

from flask import current_app

ALLOWED = {"jpg", "jpeg", "png", "webp"}


DOCUMENTS = {"jpg", "jpeg", "png", "webp", "pdf"}


def private_folder():
    return os.path.join(os.path.dirname(current_app.config["UPLOAD_FOLDER"].rstrip("/")), "private")


def save_private(file):
    extension = file.filename.rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
    if extension not in DOCUMENTS:
        raise ValueError("Upload a photo (JPG, PNG) or a PDF of the slip")
    folder = private_folder()
    os.makedirs(folder, exist_ok=True)
    name = f"{uuid.uuid4().hex}.{extension}"
    file.save(os.path.join(folder, name))
    return name


def save_image(file):
    extension = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if extension not in ALLOWED:
        raise ValueError("Upload a JPG, PNG or WEBP image")
    folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(folder, exist_ok=True)
    name = f"{uuid.uuid4().hex}.{extension}"
    file.save(os.path.join(folder, name))
    return name
