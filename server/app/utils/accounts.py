import re


def phone_key(phone):
    digits = "".join(character for character in str(phone or "") if character.isdigit())
    return digits[-9:]


def find_account(identifier):
    from app.models import User

    identifier = (identifier or "").strip()
    if "@" in identifier:
        return User.query.filter(User.email == identifier.lower()).first()
    key = phone_key(identifier)
    if len(key) < 9:
        return None
    matches = [user for user in User.query.filter(User.removed_at.is_(None)).all() if phone_key(user.phone) == key]
    return matches[0] if len(matches) == 1 else None


COMMON = {"password1", "password123", "12345678a", "qwerty123", "abc12345", "admin123", "letmein1", "welcome1", "passw0rd", "iloveyou1"}


def password_problem(password):
    if len(password or "") < 8:
        return "Use at least 8 characters"
    if len(password) > 128:
        return "Use 128 characters or fewer"
    if password.lower() in COMMON:
        return "That password is too common. Choose another"
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        return "Use both letters and numbers"
    return None
