from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models import PortfolioItem


class PortfolioSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = PortfolioItem
        include_fk = True
