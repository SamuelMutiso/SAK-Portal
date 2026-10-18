"""store uploaded files in the database

Revision ID: e82502463c6b
Revises: 73e0c8a82c80
Create Date: 2026-10-18 16:57:54.457127

"""
from alembic import op
import sqlalchemy as sa


revision = 'e82502463c6b'
down_revision = '73e0c8a82c80'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('stored_files',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=80), nullable=False),
    sa.Column('content_type', sa.String(length=40), nullable=False),
    sa.Column('data', sa.LargeBinary(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )


def downgrade():
    op.drop_table('stored_files')
