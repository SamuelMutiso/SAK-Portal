"""add consent and director role

Revision ID: 41e13cb57926
Revises: 2d626db93598
Create Date: 2026-10-08 19:17:50.799025

"""
from alembic import op
import sqlalchemy as sa


revision = '41e13cb57926'
down_revision = '2d626db93598'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('consents',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('version', sa.String(length=20), nullable=False),
    sa.Column('accepted_terms', sa.Boolean(), nullable=False),
    sa.Column('accepted_privacy', sa.Boolean(), nullable=False),
    sa.Column('child_data', sa.Boolean(), nullable=True),
    sa.Column('photo_consent', sa.Boolean(), nullable=True),
    sa.Column('signature', sa.String(length=120), nullable=False),
    sa.Column('ip_address', sa.String(length=64), nullable=True),
    sa.Column('user_agent', sa.String(length=400), nullable=True),
    sa.Column('accepted_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('consents', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_consents_user_id'), ['user_id'], unique=False)

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('removed_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('photo_consent', sa.Boolean(), nullable=True))


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('photo_consent')
        batch_op.drop_column('removed_at')

    with op.batch_alter_table('consents', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_consents_user_id'))

    op.drop_table('consents')
