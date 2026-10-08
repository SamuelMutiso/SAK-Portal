"""add audit log

Revision ID: 2d626db93598
Revises: b7cb3493d3d3
Create Date: 2026-10-08 18:31:32.699422

"""
from alembic import op
import sqlalchemy as sa


revision = '2d626db93598'
down_revision = 'b7cb3493d3d3'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('audit_logs',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('user_name', sa.String(length=120), nullable=True),
    sa.Column('user_role', sa.String(length=20), nullable=True),
    sa.Column('kind', sa.String(length=20), nullable=False),
    sa.Column('action', sa.String(length=150), nullable=False),
    sa.Column('method', sa.String(length=10), nullable=True),
    sa.Column('path', sa.String(length=255), nullable=True),
    sa.Column('status', sa.Integer(), nullable=True),
    sa.Column('changes', sa.JSON(), nullable=True),
    sa.Column('ip_address', sa.String(length=64), nullable=True),
    sa.Column('user_agent', sa.String(length=400), nullable=True),
    sa.Column('device', sa.String(length=120), nullable=True),
    sa.Column('previous_hash', sa.String(length=64), nullable=True),
    sa.Column('entry_hash', sa.String(length=64), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('audit_logs', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_audit_logs_created_at'), ['created_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_audit_logs_kind'), ['kind'], unique=False)
        batch_op.create_index(batch_op.f('ix_audit_logs_user_id'), ['user_id'], unique=False)


def downgrade():
    with op.batch_alter_table('audit_logs', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_audit_logs_user_id'))
        batch_op.drop_index(batch_op.f('ix_audit_logs_kind'))
        batch_op.drop_index(batch_op.f('ix_audit_logs_created_at'))

    op.drop_table('audit_logs')
