"""add live bus position

Revision ID: ff26aa179bec
Revises: 919a3ba6078e
Create Date: 2026-10-18 23:35:47.810819

"""
from alembic import op
import sqlalchemy as sa


revision = 'ff26aa179bec'
down_revision = '919a3ba6078e'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('transport_routes', schema=None) as batch_op:
        batch_op.add_column(sa.Column('live_lat', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('live_lng', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('live_at', sa.DateTime(), nullable=True))


def downgrade():
    with op.batch_alter_table('transport_routes', schema=None) as batch_op:
        batch_op.drop_column('live_at')
        batch_op.drop_column('live_lng')
        batch_op.drop_column('live_lat')
