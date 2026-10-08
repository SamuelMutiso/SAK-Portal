from app.routes.assessments import assessments_bp
from app.routes.attendance import attendance_bp
from app.routes.auth import auth_bp
from app.routes.classes import classes_bp
from app.routes.clubs import clubs_bp
from app.routes.dashboard import dashboard_bp
from app.routes.events import events_bp
from app.routes.fees import fees_bp
from app.routes.homework import homework_bp
from app.routes.notices import notices_bp
from app.routes.students import students_bp
from app.routes.transport import transport_bp
from app.routes.users import users_bp

BLUEPRINTS = (
    auth_bp,
    users_bp,
    students_bp,
    classes_bp,
    clubs_bp,
    notices_bp,
    events_bp,
    attendance_bp,
    homework_bp,
    assessments_bp,
    transport_bp,
    dashboard_bp,
    fees_bp,
)


def register_routes(app):
    for blueprint in BLUEPRINTS:
        app.register_blueprint(blueprint)
