from dotenv import load_dotenv
from flask import Flask, jsonify
from marshmallow import ValidationError

from app.commands import register_commands
from app.config import Config
from app.services.audit import register_audit
from app.extensions import bcrypt, cors, db, jwt, limiter, mail, migrate
from app.routes import register_routes

load_dotenv()


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    limiter.init_app(app)
    cors.init_app(app, origins=app.config["CORS_ORIGINS"], supports_credentials=True)

    from app import models

    register_routes(app)
    register_commands(app)
    register_audit(app)

    from app.models import User

    @jwt.token_in_blocklist_loader
    def account_disabled(jwt_header, jwt_payload):
        user = db.session.get(User, int(jwt_payload["sub"]))
        return user is None or not user.is_active

    @jwt.revoked_token_loader
    def revoked(jwt_header, jwt_payload):
        return jsonify(error="This account has been switched off. Contact the school office."), 401

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

    @app.errorhandler(429)
    def too_many_requests(error):
        return jsonify(error="Too many requests, try again later"), 429

    return app
