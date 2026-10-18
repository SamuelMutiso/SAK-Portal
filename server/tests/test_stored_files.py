import io
import shutil

from app.models import AuditLog, StoredFile
from tests.test_slips import bill, upload

JPEG = b"\xff\xd8\xff\xe0 real jpeg"


def test_slip_pictures_survive_a_wiped_disk(app, client, parent_headers):
    bill(app)
    slip = upload(client, parent_headers, content=JPEG).get_json()
    shutil.rmtree(app.config["UPLOAD_FOLDER"], ignore_errors=True)
    response = client.get(f"/api/fees/slips/{slip['id']}/file", headers=parent_headers)
    assert response.status_code == 200 and response.data == JPEG and response.mimetype == "image/jpeg"
    assert StoredFile.query.count() == 1
    assert all("real jpeg" not in str(entry.changes) for entry in AuditLog.query.all())


def test_portfolio_photos_survive_a_wiped_disk(app, client, teacher_headers, parent_headers):
    data = {"student_id": "1", "title": "Clay pot", "learning_area": "Creative Arts", "image": (io.BytesIO(JPEG), "pot.jpg")}
    assert client.post("/api/portfolio", data=data, headers=teacher_headers, content_type="multipart/form-data").status_code == 201
    shutil.rmtree(app.config["UPLOAD_FOLDER"], ignore_errors=True)
    url = client.get("/api/portfolio/student/1", headers=parent_headers).get_json()[0]["image_url"]
    response = client.get(url)
    assert response.status_code == 200 and response.data == JPEG
    assert client.get(url.split("?")[0]).status_code == 404
