"""add mark changes

Revision ID: 5ca61bb06203
Revises: 41e13cb57926
Create Date: 2026-10-08 20:21:59.976849

"""
from alembic import op
import sqlalchemy as sa


revision = '5ca61bb06203'
down_revision = '41e13cb57926'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('mark_changes',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('assessment_id', sa.Integer(), nullable=False),
    sa.Column('old_score', sa.Integer(), nullable=True),
    sa.Column('old_level', sa.String(length=2), nullable=True),
    sa.Column('new_score', sa.Integer(), nullable=True),
    sa.Column('new_level', sa.String(length=2), nullable=True),
    sa.Column('reason', sa.String(length=300), nullable=False),
    sa.Column('changed_by_id', sa.Integer(), nullable=True),
    sa.Column('changed_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['assessment_id'], ['assessments.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['changed_by_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('mark_changes')
