from marshmallow import Schema, fields, validate
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models import User
from app.models.user import ROLES


class UserSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = User
        load_instance = False
        exclude = ("password_hash",)


class UserCreateSchema(Schema):
    full_name = fields.String(required=True, validate=validate.Length(min=2, max=120))
    email = fields.Email(required=True)
    phone = fields.String(required=True, validate=validate.Regexp(r"^\+?\d{9,13}$"))
    role = fields.String(required=True, validate=validate.OneOf(ROLES))
    password = fields.String(required=True, load_only=True, validate=validate.Length(min=8))


class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True)
