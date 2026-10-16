from marshmallow import fields
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models import PortfolioItem
from app.services.signed_files import signed_url


class PortfolioSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = PortfolioItem
        include_fk = True

    image_url = fields.Function(lambda obj: signed_url(obj.image_url), dump_only=True)
