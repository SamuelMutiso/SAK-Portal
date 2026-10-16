"""add fees ledger

Revision ID: e732f1c94af9
Revises: 1ce5f1495221
Create Date: 2026-10-16 20:08:09.789747

"""
from alembic import op
import sqlalchemy as sa


revision = 'e732f1c94af9'
down_revision = '1ce5f1495221'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('discounts',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=80), nullable=False),
    sa.Column('kind', sa.String(length=10), nullable=False),
    sa.Column('value', sa.Integer(), nullable=False),
    sa.Column('applies_to', sa.String(length=20), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )
    op.create_table('fee_items',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=80), nullable=False),
    sa.Column('category', sa.String(length=20), nullable=False),
    sa.Column('description', sa.String(length=200), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('sort_order', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )
    op.create_table('fee_rates',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('item_id', sa.Integer(), nullable=False),
    sa.Column('term', sa.String(length=20), nullable=False),
    sa.Column('classroom_id', sa.Integer(), nullable=True),
    sa.Column('learner_type', sa.String(length=10), nullable=False),
    sa.Column('transport_route_id', sa.Integer(), nullable=True),
    sa.Column('amount', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['classroom_id'], ['classrooms.id'], ),
    sa.ForeignKeyConstraint(['item_id'], ['fee_items.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['transport_route_id'], ['transport_routes.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('invoices',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('number', sa.String(length=20), nullable=False),
    sa.Column('student_id', sa.Integer(), nullable=False),
    sa.Column('term', sa.String(length=20), nullable=False),
    sa.Column('issued_on', sa.Date(), nullable=False),
    sa.Column('due_date', sa.Date(), nullable=True),
    sa.Column('status', sa.String(length=10), nullable=False),
    sa.Column('paid_amount', sa.Integer(), nullable=False),
    sa.Column('note', sa.String(length=200), nullable=True),
    sa.Column('created_by_id', sa.Integer(), nullable=True),
    sa.Column('cancelled_reason', sa.String(length=300), nullable=True),
    sa.Column('cancelled_by_id', sa.Integer(), nullable=True),
    sa.Column('cancelled_at', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['cancelled_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('number')
    )
    op.create_table('student_discounts',
    sa.Column('student_id', sa.Integer(), nullable=False),
    sa.Column('discount_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['discount_id'], ['discounts.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('student_id', 'discount_id')
    )
    op.create_table('invoice_lines',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('invoice_id', sa.Integer(), nullable=False),
    sa.Column('item_id', sa.Integer(), nullable=True),
    sa.Column('description', sa.String(length=120), nullable=False),
    sa.Column('category', sa.String(length=20), nullable=True),
    sa.Column('amount', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['item_id'], ['fee_items.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.add_column(sa.Column('receipt_number', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('reference', sa.String(length=60), nullable=True))
        batch_op.add_column(sa.Column('bank_name', sa.String(length=60), nullable=True))
        batch_op.add_column(sa.Column('note', sa.String(length=200), nullable=True))
        batch_op.add_column(sa.Column('paid_on', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('recorded_by_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('reversed_reason', sa.String(length=300), nullable=True))
        batch_op.add_column(sa.Column('reversed_by_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('reversed_at', sa.DateTime(), nullable=True))
        batch_op.alter_column('phone',
               existing_type=sa.VARCHAR(length=20),
               nullable=True)
        batch_op.create_unique_constraint('uq_payments_receipt_number', ['receipt_number'])
        batch_op.create_foreign_key('fk_payments_recorded_by_id_users', 'users', ['recorded_by_id'], ['id'])
        batch_op.create_foreign_key('fk_payments_reversed_by_id_users', 'users', ['reversed_by_id'], ['id'])



def downgrade():
    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.drop_constraint('fk_payments_reversed_by_id_users', type_='foreignkey')
        batch_op.drop_constraint('fk_payments_recorded_by_id_users', type_='foreignkey')
        batch_op.drop_constraint('uq_payments_receipt_number', type_='unique')
        batch_op.alter_column('phone',
               existing_type=sa.VARCHAR(length=20),
               nullable=False)
        batch_op.drop_column('reversed_at')
        batch_op.drop_column('reversed_by_id')
        batch_op.drop_column('reversed_reason')
        batch_op.drop_column('recorded_by_id')
        batch_op.drop_column('paid_on')
        batch_op.drop_column('note')
        batch_op.drop_column('bank_name')
        batch_op.drop_column('reference')
        batch_op.drop_column('receipt_number')

    op.drop_table('invoice_lines')
    op.drop_table('student_discounts')
    op.drop_table('invoices')
    op.drop_table('fee_rates')
    op.drop_table('fee_items')
    op.drop_table('discounts')
