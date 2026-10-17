"""add learning materials

Revision ID: 06c95ecae9aa
Revises: 3ac7ec613dff
Create Date: 2026-10-17 17:38:22.291769

"""
from alembic import op
import sqlalchemy as sa


revision = '06c95ecae9aa'
down_revision = '3ac7ec613dff'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('learning_materials',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('classroom_id', sa.Integer(), nullable=False),
    sa.Column('subject', sa.String(length=60), nullable=False),
    sa.Column('topic', sa.String(length=120), nullable=True),
    sa.Column('title', sa.String(length=150), nullable=False),
    sa.Column('kind', sa.String(length=10), nullable=False),
    sa.Column('body', sa.Text(), nullable=True),
    sa.Column('link_url', sa.String(length=500), nullable=True),
    sa.Column('file_name', sa.String(length=150), nullable=True),
    sa.Column('file_type', sa.String(length=40), nullable=True),
    sa.Column('file_size', sa.Integer(), nullable=True),
    sa.Column('file_data', sa.LargeBinary(), nullable=True),
    sa.Column('teacher_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['classroom_id'], ['classrooms.id'], ),
    sa.ForeignKeyConstraint(['teacher_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('learning_materials')
