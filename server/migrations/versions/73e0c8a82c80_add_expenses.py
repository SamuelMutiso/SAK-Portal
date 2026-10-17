"""add expenses

Revision ID: 73e0c8a82c80
Revises: b132caa17f7b
Create Date: 2026-10-17 22:01:34.645138

"""
from alembic import op
import sqlalchemy as sa


revision = '73e0c8a82c80'
down_revision = 'b132caa17f7b'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('expenses',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('spent_on', sa.Date(), nullable=False),
    sa.Column('category', sa.String(length=40), nullable=False),
    sa.Column('description', sa.String(length=200), nullable=False),
    sa.Column('amount', sa.Integer(), nullable=False),
    sa.Column('paid_to', sa.String(length=120), nullable=False),
    sa.Column('method', sa.String(length=10), nullable=False),
    sa.Column('reference', sa.String(length=60), nullable=True),
    sa.Column('receipt_name', sa.String(length=150), nullable=True),
    sa.Column('receipt_type', sa.String(length=40), nullable=True),
    sa.Column('receipt_data', sa.LargeBinary(), nullable=True),
    sa.Column('recorded_by_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('voided_at', sa.DateTime(), nullable=True),
    sa.Column('voided_by_id', sa.Integer(), nullable=True),
    sa.Column('void_reason', sa.String(length=300), nullable=True),
    sa.ForeignKeyConstraint(['recorded_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['voided_by_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('expenses')
