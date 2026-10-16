"""add session revocation and two step sign in

Revision ID: 3ac7ec613dff
Revises: 0b06a2faa293
Create Date: 2026-10-17 00:40:56.815011

"""
from alembic import op
import sqlalchemy as sa


revision = '3ac7ec613dff'
down_revision = '0b06a2faa293'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('sessions_valid_after', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('totp_secret', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('totp_pending', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('totp_last_step', sa.Integer(), nullable=True))


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('totp_last_step')
        batch_op.drop_column('totp_pending')
        batch_op.drop_column('totp_secret')
        batch_op.drop_column('sessions_valid_after')

