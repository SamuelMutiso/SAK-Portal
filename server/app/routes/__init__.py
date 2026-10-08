from app.routes.acknowledgements import acknowledgements_bp
from app.routes.analytics import analytics_bp
from app.routes.assessments import assessments_bp
from app.routes.attendance import attendance_bp
from app.routes.auth import auth_bp
from app.routes.classes import classes_bp
from app.routes.clubs import clubs_bp
from app.routes.consent import consent_bp
from app.routes.dashboard import dashboard_bp
from app.routes.diary import diary_bp
from app.routes.owner import owner_bp
from app.routes.events import events_bp
from app.routes.fees import fees_bp
from app.routes.homework import homework_bp
from app.routes.leave import leave_bp
from app.routes.library import library_bp
from app.routes.meta import meta_bp
from app.routes.notices import notices_bp
from app.routes.payments import payments_bp
from app.routes.pickups import pickups_bp
from app.routes.portfolio import portfolio_bp
from app.routes.reports import reports_bp
from app.routes.sba import sba_bp
from app.routes.students import students_bp
from app.routes.timetable import timetable_bp
from app.routes.transport import transport_bp
from app.routes.trips import trips_bp
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
    meta_bp,
    reports_bp,
    sba_bp,
    pickups_bp,
    trips_bp,
    acknowledgements_bp,
    payments_bp,
    portfolio_bp,
    diary_bp,
    leave_bp,
    library_bp,
    timetable_bp,
    owner_bp,
    consent_bp,
    analytics_bp,
)


def register_routes(app):
    for blueprint in BLUEPRINTS:
        app.register_blueprint(blueprint)
