from dotenv import load_dotenv
from flask import Flask, jsonify
from marshmallow import ValidationError

from app.config import Config
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

    @app.get("/api/health")
    def health():
        return jsonify(status="ok")

    @app.errorhandler(ValidationError)
    def validation_error(error):
        return jsonify(errors=error.messages), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify(error="Not found"), 404

    @app.errorhandler(429)
    def too_many_requests(error):
        return jsonify(error="Too many requests, try again later"), 429

    return app
