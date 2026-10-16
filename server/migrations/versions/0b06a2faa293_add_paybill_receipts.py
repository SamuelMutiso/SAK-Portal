"""add paybill receipts

Revision ID: 0b06a2faa293
Revises: 9c9c86e153ec
Create Date: 2026-10-16 23:28:49.811140

"""
from alembic import op
import sqlalchemy as sa


revision = '0b06a2faa293'
down_revision = '9c9c86e153ec'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('paybill_receipts',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('trans_id', sa.String(length=30), nullable=False),
    sa.Column('amount', sa.Integer(), nullable=False),
    sa.Column('phone', sa.String(length=20), nullable=True),
    sa.Column('payer_name', sa.String(length=120), nullable=True),
    sa.Column('account', sa.String(length=40), nullable=True),
    sa.Column('received_at', sa.DateTime(), nullable=False),
    sa.Column('payment_id', sa.Integer(), nullable=True),
    sa.Column('assigned_by_id', sa.Integer(), nullable=True),
    sa.Column('assigned_at', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['assigned_by_id'], ['users.id'], name='fk_paybill_receipts_assigned_by_id_users'),
    sa.ForeignKeyConstraint(['payment_id'], ['payments.id'], name='fk_paybill_receipts_payment_id_payments'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('trans_id')
    )


def downgrade():
    op.drop_table('paybill_receipts')
