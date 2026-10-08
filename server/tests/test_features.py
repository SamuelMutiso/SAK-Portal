import io
from datetime import date, timedelta


def test_classes_list_learning_areas(client, teacher_headers):
    classroom = client.get("/api/classes", headers=teacher_headers).get_json()[0]
    assert "Science and Technology" in classroom["learning_areas"]
    assert classroom["uses_marks"] is True


def test_rubric_entry_without_score(client, teacher_headers):
    payload = {"subject": "English", "term": "Term 3 2026", "exam": "Mid-Term", "scores": [{"student_id": 1, "level": "ME"}]}
    response = client.post("/api/assessments/sheet", json=payload, headers=teacher_headers)
    assert response.get_json()[0]["level"] == "ME"


def test_teacher_cannot_write_head_comment(client, teacher_headers, admin_headers, parent_headers):
    client.put("/api/reports/student/1", json={"teacher_comment": "Good", "head_comment": "Ignored"}, headers=teacher_headers)
    report = client.get("/api/reports/student/1", headers=parent_headers).get_json()["report"]
    assert report["teacher_comment"] == "Good"
    assert report["head_comment"] is None
    client.put("/api/reports/student/1", json={"head_comment": "Well done"}, headers=admin_headers)
    assert client.get("/api/reports/student/1", headers=parent_headers).get_json()["report"]["head_comment"] == "Well done"


def test_other_parent_cannot_read_report(client, other_parent_headers):
    assert client.get("/api/reports/student/1", headers=other_parent_headers).status_code == 403


def test_sba_export_is_csv(client, admin_headers, teacher_headers):
    payload = {"subject": "Mathematics", "term": "Term 3 2026", "exam": "End-Term", "scores": [{"student_id": 1, "score": 70}]}
    client.post("/api/assessments/sheet", json=payload, headers=teacher_headers)
    response = client.get("/api/sba/export/1", headers=admin_headers)
    assert response.mimetype == "text/csv"
    assert "Mathematics" in response.get_data(as_text=True)
    assert ",70," in response.get_data(as_text=True)


def test_parent_adds_pickup_person(client, parent_headers, other_parent_headers):
    person = {"full_name": "Rose Aunt", "relationship": "Aunt", "phone": "0744000000"}
    assert client.post("/api/pickups/student/1", json=person, headers=parent_headers).status_code == 201
    assert client.post("/api/pickups/student/1", json=person, headers=other_parent_headers).status_code == 403


def test_driver_marks_boarded_and_parent_gets_sms(client, driver_headers, parent_headers):
    response = client.post("/api/trips/log", json={"student_id": 1, "event": "boarded"}, headers=driver_headers)
    assert response.status_code == 201
    assert response.get_json()["sms"]["recipients"] == ["+254700000003"]
    assert client.get("/api/trips/student/1", headers=parent_headers).get_json()[0]["event"] == "boarded"


def test_driver_cannot_log_learner_on_other_route(client, driver_headers):
    response = client.post("/api/trips/log", json={"student_id": 2, "event": "boarded"}, headers=driver_headers)
    assert response.status_code == 403


def test_seen_receipts_counted_for_admin(client, admin_headers, parent_headers):
    notice = client.post("/api/notices", json={"title": "Hello", "body": "World"}, headers=admin_headers).get_json()["notice"]
    client.post("/api/acknowledgements", json={"item_type": "notice", "item_id": notice["id"]}, headers=parent_headers)
    notices = client.get("/api/notices", headers=admin_headers).get_json()
    assert notices[0]["seen_count"] == 1
    assert notices[0]["recipient_count"] == 2


def test_simulated_mpesa_payment_reduces_balance(client, parent_headers):
    response = client.post("/api/payments/stk", json={"student_id": 1, "amount": 2000, "phone": "0700000003"}, headers=parent_headers)
    assert response.get_json()["payment"]["status"] == "completed"
    assert client.get("/api/payments/student/1", headers=parent_headers).get_json()["balance"] == 3000


def test_payment_more_than_balance_rejected(client, parent_headers):
    response = client.post("/api/payments/stk", json={"student_id": 1, "amount": 9000, "phone": "0700000003"}, headers=parent_headers)
    assert response.status_code == 400


def test_mpesa_callback_completes_pending_payment(app, client):
    from app.extensions import db
    from app.models import Payment

    db.session.add(Payment(student_id=1, amount=1000, phone="0700000003", checkout_id="ws_CO_1"))
    db.session.commit()
    body = {"Body": {"stkCallback": {"CheckoutRequestID": "ws_CO_1", "ResultCode": 0,
                                     "CallbackMetadata": {"Item": [{"Name": "MpesaReceiptNumber", "Value": "QWE123"}]}}}}
    client.post("/api/payments/callback", json=body)
    payment = Payment.query.filter_by(checkout_id="ws_CO_1").first()
    assert payment.status == "completed"
    assert payment.receipt == "QWE123"


def test_teacher_uploads_portfolio_photo(client, teacher_headers, parent_headers):
    data = {"student_id": "1", "title": "Clay pot", "learning_area": "Creative Arts", "image": (io.BytesIO(b"fake"), "pot.jpg")}
    response = client.post("/api/portfolio", data=data, headers=teacher_headers, content_type="multipart/form-data")
    assert response.status_code == 201
    items = client.get("/api/portfolio/student/1", headers=parent_headers).get_json()
    assert items[0]["title"] == "Clay pot"


def test_portfolio_rejects_non_images(client, teacher_headers):
    data = {"student_id": "1", "title": "Virus", "learning_area": "Creative Arts", "image": (io.BytesIO(b"x"), "run.exe")}
    response = client.post("/api/portfolio", data=data, headers=teacher_headers, content_type="multipart/form-data")
    assert response.status_code == 400


def test_diary_entry_visible_to_parent(client, teacher_headers, parent_headers):
    payload = {"date": date.today().isoformat(), "entries": [{"student_id": 1, "meals": "Porridge", "mood": "happy"}]}
    client.post("/api/diary", json=payload, headers=teacher_headers)
    assert client.get("/api/diary/student/1", headers=parent_headers).get_json()[0]["meals"] == "Porridge"


def test_leave_request_flow(client, parent_headers, admin_headers):
    start = date.today() + timedelta(days=2)
    payload = {"student_id": 1, "leave_date": start.isoformat(), "return_date": (start + timedelta(days=1)).isoformat(),
               "reason": "Clinic visit", "picked_by": "Father"}
    leave = client.post("/api/leave", json=payload, headers=parent_headers).get_json()
    response = client.patch(f"/api/leave/{leave['id']}", json={"status": "approved"}, headers=admin_headers)
    assert response.get_json()["leave"]["status"] == "approved"
    assert "approved" in response.get_json()["sms"]["message"]


def test_library_lend_and_return(client, admin_headers, parent_headers):
    loan = client.post("/api/library/loans", json={"book_id": 1, "admission_number": "a1"}, headers=admin_headers).get_json()
    assert client.post("/api/library/loans", json={"book_id": 1, "admission_number": "A2"}, headers=admin_headers).status_code == 400
    client.post(f"/api/library/loans/{loan['id']}/return", headers=admin_headers)
    assert client.get("/api/library/student/1", headers=parent_headers).get_json()[0]["returned_on"] is not None
