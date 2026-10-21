"""add sms messages

Revision ID: cac4c85af4ec
Revises: ff26aa179bec
Create Date: 2026-10-19 19:20:54.046367

"""
from alembic import op
import sqlalchemy as sa


revision = 'cac4c85af4ec'
down_revision = 'ff26aa179bec'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('sms_messages',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('phone', sa.String(length=20), nullable=False),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('provider', sa.String(length=20), nullable=True),
    sa.Column('error', sa.String(length=255), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('sms_messages', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_sms_messages_created_at'), ['created_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_sms_messages_phone'), ['phone'], unique=False)


def downgrade():
    with op.batch_alter_table('sms_messages', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_sms_messages_phone'))
        batch_op.drop_index(batch_op.f('ix_sms_messages_created_at'))

    op.drop_table('sms_messages')
