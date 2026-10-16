import os
from datetime import timezone

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from marshmallow import ValidationError
from werkzeug.middleware.proxy_fix import ProxyFix

from app.commands import register_commands
from app.config import Config
from app.services.audit import register_audit
from app.services.consent import consent_gate
from app.extensions import bcrypt, cors, db, jwt, limiter, mail, migrate
from app.routes import register_routes

load_dotenv()


WEAK_SECRETS = {"", "dev-secret", "dev-jwt-secret", "change-me", "change-me-to-a-long-random-string"}


def check_secrets(app):
    if not os.getenv("RENDER") or app.config.get("TESTING"):
        return
    for name in ("SECRET_KEY", "JWT_SECRET_KEY"):
        value = app.config.get(name) or ""
        if value in WEAK_SECRETS or len(value) < 32:
            raise RuntimeError(f"{name} must be set to a long random value in production")


def security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    response.headers["Cross-Origin-Resource-Policy"] = "cross-origin"
    if request.is_secure or request.headers.get("X-Forwarded-Proto") == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    if response.mimetype == "application/json":
        response.headers["Cache-Control"] = "no-store"
    return response


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    if app.config["PROXY_HOPS"]:
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=app.config["PROXY_HOPS"], x_proto=1)

    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    app.config["DUMMY_PASSWORD_HASH"] = bcrypt.generate_password_hash("placeholder-password-0").decode("utf-8")
    jwt.init_app(app)
    mail.init_app(app)
    limiter.init_app(app)
    check_secrets(app)
    cors.init_app(app, origins=app.config["CORS_ORIGINS"], supports_credentials=False)

    from app import models

    register_routes(app)
    register_commands(app)
    register_audit(app)
    app.before_request(consent_gate)
    app.after_request(security_headers)

    from app.models import User

    @jwt.token_in_blocklist_loader
    def account_disabled(jwt_header, jwt_payload):
        user = db.session.get(User, int(jwt_payload["sub"]))
        if user is None or not user.is_active or user.removed_at:
            return True
        if user.sessions_valid_after and jwt_payload.get("iat", 0) < int(user.sessions_valid_after.replace(tzinfo=timezone.utc).timestamp()):
            return True
        return False

    @jwt.revoked_token_loader
    def revoked(jwt_header, jwt_payload):
        return jsonify(error="Your session has ended. Please sign in again."), 401

    @app.get("/api/health")
    def health():
        return jsonify(status="ok")

    @app.errorhandler(ValidationError)
    def validation_error(error):
        return jsonify(errors=error.messages), 400

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify(error="You do not have access to this"), 403

    @app.errorhandler(413)
    def too_large(error):
        return jsonify(error="That file is too large. The limit is 5 MB"), 413

    @app.errorhandler(404)
    def not_found(error):
        return jsonify(error="Not found"), 404

    @app.errorhandler(405)
    def wrong_method(error):
        return jsonify(error="That action is not allowed here"), 405

    @app.errorhandler(500)
    def server_error(error):
        app.logger.exception("Unhandled error on %s %s", request.method, request.path)
        return jsonify(error="Something went wrong on our side. Please try again."), 500

    @app.errorhandler(429)
    def too_many_requests(error):
        return jsonify(error="Too many requests, try again later"), 429

    return app
