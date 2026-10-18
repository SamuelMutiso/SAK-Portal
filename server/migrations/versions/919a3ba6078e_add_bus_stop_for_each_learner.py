"""add bus stop for each learner

Revision ID: 919a3ba6078e
Revises: e82502463c6b
Create Date: 2026-10-18 23:12:19.886414

"""
from alembic import op
import sqlalchemy as sa


revision = '919a3ba6078e'
down_revision = 'e82502463c6b'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('students', schema=None) as batch_op:
        batch_op.add_column(sa.Column('transport_stop', sa.String(length=80), nullable=True))


def downgrade():
    with op.batch_alter_table('students', schema=None) as batch_op:
        batch_op.drop_column('transport_stop')
