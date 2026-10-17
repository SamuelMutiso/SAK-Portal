import io

from app.extensions import db
from app.models import AuditLog, Classroom, Notice, User
from tests.conftest import login

PDF = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n"


def grade(name):
    return Classroom.query.filter_by(name=name).first().id


def post_notes(client, headers, classroom_id, subject="Mathematics", title="Fractions"):
    return client.post("/api/learning/materials", json={"classroom_id": classroom_id, "subject": subject, "title": title, "kind": "notes", "body": "Halves and quarters"}, headers=headers)


def test_teacher_posts_for_own_class_only(client):
    headers = login(client, "teacher@test.com")
    assert post_notes(client, headers, grade("Grade 4")).status_code == 201
    assert post_notes(client, headers, grade("Grade 5")).status_code == 403
    assert post_notes(client, headers, grade("Grade 4"), subject="Mathematics Activities").status_code == 400
    response = client.post("/api/learning/materials", json={"classroom_id": grade("Grade 4"), "subject": "English", "title": "Read", "kind": "link", "link_url": "http://example.com"}, headers=headers)
    assert response.status_code == 400


def test_parents_see_only_their_childs_class(client):
    post_notes(client, login(client, "teacher@test.com"), grade("Grade 4"))
    parent = login(client, "parent@test.com")
    ethan = client.get("/api/students", headers=parent).get_json()[0]["id"]
    items = client.get(f"/api/learning/materials?student_id={ethan}", headers=parent).get_json()
    assert [item["title"] for item in items] == ["Fractions"]
    assert client.get(f"/api/learning/materials?classroom_id={grade('Grade 5')}", headers=parent).status_code == 403
    other = login(client, "other@test.com")
    assert client.get(f"/api/learning/materials?student_id={ethan}", headers=other).status_code == 403
    assert client.get("/api/learning/materials", headers=login(client, "driver@test.com")).status_code == 403


def test_files_are_checked_stored_and_private(client, app):
    teacher = login(client, "teacher@test.com")
    fake = client.post("/api/learning/materials", data={"classroom_id": grade("Grade 4"), "subject": "Mathematics", "title": "Sheet", "kind": "file",
                                                         "file": (io.BytesIO(b"not a pdf"), "sheet.pdf")}, headers=teacher, content_type="multipart/form-data")
    assert fake.status_code == 400
    good = client.post("/api/learning/materials", data={"classroom_id": grade("Grade 4"), "subject": "Mathematics", "title": "Sheet", "kind": "file",
                                                         "file": (io.BytesIO(PDF), "sheet.pdf")}, headers=teacher, content_type="multipart/form-data")
    assert good.status_code == 201
    material = good.get_json()
    assert material["file_name"] == "sheet.pdf" and "file_data" not in material
    download = client.get(f"/api/learning/materials/{material['id']}/file", headers=login(client, "parent@test.com"))
    assert download.status_code == 200 and download.mimetype == "application/pdf" and download.data == PDF
    assert client.get(f"/api/learning/materials/{material['id']}/file", headers=login(client, "other@test.com")).status_code == 404
    assert client.get(f"/api/learning/materials/{material['id']}/file").status_code == 401
    assert all("PDF-1.4" not in str(entry.changes) for entry in AuditLog.query.all())


def test_only_owner_or_office_deletes(client, app):
    material = post_notes(client, login(client, "teacher@test.com"), grade("Grade 4")).get_json()
    other_teacher = User(full_name="Other Teacher", email="t2@test.com", phone="0700000077", role="teacher")
    other_teacher.set_password("password123")
    db.session.add(other_teacher)
    db.session.commit()
    from tests.conftest import accept_policies
    accept_policies(other_teacher)
    db.session.commit()
    assert client.delete(f"/api/learning/materials/{material['id']}", headers=login(client, "t2@test.com")).status_code == 403
    assert client.delete(f"/api/learning/materials/{material['id']}", headers=login(client, "admin@test.com")).status_code == 204


def test_catch_up_card(client, app):
    admin = User.query.filter_by(role="admin").first()
    db.session.add(Notice(title="Sports day", body="Come cheer", audience="all", author_id=admin.id))
    db.session.commit()
    post_notes(client, login(client, "teacher@test.com"), grade("Grade 4"))
    parent = login(client, "parent@test.com")
    ethan = client.get("/api/students", headers=parent).get_json()[0]["id"]
    data = client.get(f"/api/catch-up/{ethan}", headers=parent).get_json()
    assert data["unread_notices"]["count"] == 1 and data["unread_notices"]["titles"] == ["Sports day"]
    assert data["new_materials"] == 1 and data["fee_balance"] == 5000
    notice_id = Notice.query.first().id
    client.post("/api/acknowledgements", json={"item_type": "notice", "item_id": notice_id}, headers=parent)
    assert client.get(f"/api/catch-up/{ethan}", headers=parent).get_json()["unread_notices"]["count"] == 0
    assert client.get(f"/api/catch-up/{ethan}", headers=login(client, "other@test.com")).status_code == 403
    assert client.get(f"/api/catch-up/{ethan}", headers=login(client, "teacher@test.com")).status_code == 403
