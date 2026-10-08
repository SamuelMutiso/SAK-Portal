"""add exam scores and fee balance

Revision ID: bee4a74572c6
Revises: 555fef3393c6
Create Date: 2026-10-08 12:29:02.738492

"""
from alembic import op
import sqlalchemy as sa


revision = 'bee4a74572c6'
down_revision = '555fef3393c6'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('assessments', schema=None) as batch_op:
        batch_op.add_column(sa.Column('exam', sa.String(length=20), nullable=False, server_default='End-Term'))
        batch_op.add_column(sa.Column('score', sa.Integer(), nullable=True))

    with op.batch_alter_table('students', schema=None) as batch_op:
        batch_op.add_column(sa.Column('fee_balance', sa.Integer(), nullable=True, server_default='0'))


def downgrade():
    with op.batch_alter_table('students', schema=None) as batch_op:
        batch_op.drop_column('fee_balance')

    with op.batch_alter_table('assessments', schema=None) as batch_op:
        batch_op.drop_column('score')
        batch_op.drop_column('exam')
