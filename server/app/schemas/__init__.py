from app.schemas.user import UserSchema, UserCreateSchema, LoginSchema
from app.schemas.classroom import ClassroomSchema
from app.schemas.transport_route import TransportRouteSchema
from app.schemas.student import AdmissionSchema, HistorySchema, LeaveSchema, StudentSchema
from app.schemas.club import ClubActivitySchema, ClubSchema
from app.schemas.notice import NoticeSchema
from app.schemas.event import EventSchema
from app.schemas.attendance import AttendanceSchema, AttendanceBatchSchema
from app.schemas.homework import HomeworkSchema
from app.schemas.assessment import AssessmentSchema, GradeSheetSchema, LearnerSheetSchema, MarkChangeSchema
from app.schemas.term_report import TermReportSchema
from app.schemas.pickup import PickupSchema
from app.schemas.payment import PaymentSchema, PayRequestSchema
from app.schemas.portfolio import PortfolioSchema
from app.schemas.diary import DiarySchema, DiarySheetSchema
from app.schemas.leave_request import LeaveRequestSchema
from app.schemas.library import BookSchema, LoanSchema
from app.schemas.timetable import TimetableSlotSchema



LOCKED_FIELDS = ("id", "fee_balance", "created_at", "password_hash", "recorded_by_id", "reversed_by_id")


def _lock_field(self, field_name, field_obj):
    if field_name in LOCKED_FIELDS:
        field_obj.dump_only = True


def _lock_fields():
    from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

    for schema in list(globals().values()):
        if isinstance(schema, type) and issubclass(schema, SQLAlchemyAutoSchema) and schema is not SQLAlchemyAutoSchema:
            schema.on_bind_field = _lock_field


_lock_fields()
