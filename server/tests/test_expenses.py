import io
from datetime import date, timedelta

from app.extensions import db
from app.models import AuditLog
from tests.conftest import accept_policies, login, make_user

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 32


def bursar():
    user = make_user("Bursar", "bursar@test.com", "bursar", "0700000088")
    db.session.commit()
    accept_policies(user)
    db.session.commit()


def director():
    user = make_user("Director", "director@test.com", "director", "0700000089")
    db.session.commit()
    accept_policies(user)
    db.session.commit()


def entry(**changes):
    return {"spent_on": date.today().isoformat(), "category": "Fuel & transport", "description": "Diesel for the bus", "amount": 6500,
            "paid_to": "Rubis Kitengela", "method": "Cash", **changes}


def test_bursar_records_and_office_and_director_can_see(client, app):
    bursar()
    director()
    headers = login(client, "bursar@test.com")
    assert client.post("/api/expenses", json=entry(), headers=headers).status_code == 201
    assert client.post("/api/expenses", json=entry(method="M-Pesa"), headers=headers).status_code == 400
    assert client.post("/api/expenses", json=entry(method="M-Pesa", reference="TJH4K2LQ9P", amount=3000, category="Food & kitchen"), headers=headers).status_code == 201
    for email in ("bursar@test.com", "admin@test.com", "director@test.com"):
        data = client.get("/api/expenses", headers=login(client, email)).get_json()
        assert data["total"] == 9500 and data["count"] == 2 and data["by_category"]["Fuel & transport"] == 6500
    assert client.get("/api/expenses", headers=login(client, "admin@test.com")).get_json()["can_add"] is False
    assert client.post("/api/expenses", json=entry(), headers=login(client, "admin@test.com")).status_code == 403
    assert client.post("/api/expenses", json=entry(), headers=login(client, "director@test.com")).status_code == 403
    for email in ("teacher@test.com", "parent@test.com"):
        assert client.get("/api/expenses", headers=login(client, email)).status_code == 403


def test_dates_and_amounts_are_checked(client):
    bursar()
    headers = login(client, "bursar@test.com")
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    long_ago = (date.today() - timedelta(days=120)).isoformat()
    assert client.post("/api/expenses", json=entry(spent_on=tomorrow), headers=headers).status_code == 400
    assert client.post("/api/expenses", json=entry(spent_on=long_ago), headers=headers).status_code == 400
    assert client.post("/api/expenses", json=entry(amount=0), headers=headers).status_code == 400
    assert client.post("/api/expenses", json=entry(category="Holiday"), headers=headers).status_code == 400


def test_expenses_cannot_be_deleted_only_cancelled_with_a_reason(client):
    bursar()
    headers = login(client, "bursar@test.com")
    expense = client.post("/api/expenses", json=entry(amount=65000), headers=headers).get_json()
    assert client.delete(f"/api/expenses/{expense['id']}", headers=headers).status_code in (404, 405)
    assert client.post(f"/api/expenses/{expense['id']}/void", json={"reason": "no"}, headers=headers).status_code == 400
    voided = client.post(f"/api/expenses/{expense['id']}/void", json={"reason": "Typed 65,000 instead of 6,500"}, headers=headers).get_json()
    assert voided["voided"] and voided["voided_by"] == "Bursar"
    assert client.post(f"/api/expenses/{expense['id']}/void", json={"reason": "Again please"}, headers=headers).status_code == 409
    data = client.get("/api/expenses", headers=headers).get_json()
    assert data["total"] == 0 and data["voided"] == 1 and len(data["items"]) == 1
    assert any("Cancelled an expense" in entry.action for entry in AuditLog.query.all())


def test_receipts_are_checked_and_private(client):
    bursar()
    headers = login(client, "bursar@test.com")
    form = {key: str(value) for key, value in entry().items()}
    bad = client.post("/api/expenses", data={**form, "receipt": (io.BytesIO(b"hello"), "receipt.png")}, headers=headers, content_type="multipart/form-data")
    assert bad.status_code == 400
    good = client.post("/api/expenses", data={**form, "receipt": (io.BytesIO(PNG), "receipt.png")}, headers=headers, content_type="multipart/form-data").get_json()
    assert good["has_receipt"]
    assert client.get(f"/api/expenses/{good['id']}/receipt", headers=login(client, "admin@test.com")).data == PNG
    assert client.get(f"/api/expenses/{good['id']}/receipt", headers=login(client, "parent@test.com")).status_code == 403
    assert all("PNG" not in str(log.changes) for log in AuditLog.query.all())
