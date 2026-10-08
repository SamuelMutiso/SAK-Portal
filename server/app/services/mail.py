import logging

from flask_mail import Message

from app.extensions import mail


def send_email(to, subject, body):
    try:
        mail.send(Message(subject=subject, recipients=[to], body=body))
        return True
    except Exception as error:
        logging.warning("Email to %s failed: %s", to, error)
        return False
