import os
from datetime import timedelta


def database_url():
    url = os.getenv("DATABASE_URL", "sqlite:///success_academy.db")
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    SQLALCHEMY_DATABASE_URI = database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    RATELIMIT_STORAGE_URI = os.getenv("REDIS_URL", "memory://")
    RATELIMIT_DEFAULT = "200 per minute"
    SMS_USERNAME = os.getenv("AT_USERNAME", "sandbox")
    SMS_API_KEY = os.getenv("AT_API_KEY", "")
    SMS_SENDER_ID = os.getenv("AT_SENDER_ID", "")
    SCHOOL_PAYBILL = os.getenv("SCHOOL_PAYBILL", "")
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_USERNAME")


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_ENGINE_OPTIONS = {}
    JWT_SECRET_KEY = "test-jwt-secret-key-that-is-long-enough"
    RATELIMIT_ENABLED = False
    RATELIMIT_STORAGE_URI = "memory://"
