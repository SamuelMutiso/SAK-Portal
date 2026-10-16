import base64
import hashlib
import hmac
import secrets
import struct
import time
from urllib.parse import quote

STEP = 30


def new_secret():
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")


def code_at(secret, counter):
    key = base64.b32decode(secret + "=" * (-len(secret) % 8))
    digest = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    value = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
    return f"{value % 1000000:06d}"


def matching_step(secret, code, now=None):
    code = "".join(character for character in str(code or "") if character.isdigit())
    if len(code) != 6 or not secret:
        return None
    current = int((now or time.time()) // STEP)
    for step in (current - 1, current, current + 1):
        if hmac.compare_digest(code_at(secret, step), code):
            return step
    return None


def setup_link(secret, account, issuer="Success Academy"):
    return f"otpauth://totp/{quote(issuer)}:{quote(account)}?secret={secret}&issuer={quote(issuer)}&digits=6&period={STEP}"
