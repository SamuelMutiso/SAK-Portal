"""add school life features

Revision ID: d2b95d6b5d03
Revises: bee4a74572c6
Create Date: 2026-10-08 13:09:31.171492

"""
from alembic import op
import sqlalchemy as sa


revision = 'd2b95d6b5d03'
down_revision = 'bee4a74572c6'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('books',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=150), nullable=False),
    sa.Column('author', sa.String(length=120), nullable=True),
    sa.Column('level', sa.String(length=40), nullable=True),
    sa.Column('copies', sa.Integer(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('acknowledgements',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('item_type', sa.String(length=20), nullable=False),
    sa.Column('item_id', sa.Integer(), nullable=False),
    sa.Column('seen_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'item_type', 'item_id')
    )
    op.create_table('authorized_pickups',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('student_id', sa.Integer(), nullable=False),
    sa.Column('full_name', sa.String(length=120), nullable=False),
    sa.Column('relationship', sa.String(length=40), nullable=False),
    sa.Column('phone', sa.String(length=20), nullable=False),
    sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('diary_entries',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('student_id', sa.Integer(), nullable=False),
    sa.Column('date', sa.Date(), nullable=False),
    sa.Column('meals', sa.String(length=120), nullable=True),
    sa.Column('nap', sa.String(length=60), nullable=True),
    sa.Column('mood', sa.String(length=10), nullable=True),
    sa.Column('activities', sa.Text(), nullable=True),
    sa.Column('note', sa.Text(), nullable=True),
    sa.Column('teacher_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
    sa.ForeignKeyConstraint(['teacher_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('student_id', 'date')
    )
    op.create_table('leave_requests',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('student_id', sa.Integer(), nullable=False),
    sa.Column('parent_id', sa.Integer(), nullable=False),
    sa.Column('leave_date', sa.Date(), nullable=False),
    sa.Column('return_date', sa.Date(), nullable=False),
    sa.Column('reason', sa.Text(), nullable=False),
    sa.Column('picked_by', sa.String(length=120), nullable=False),
    sa.Column('status', sa.String(length=10), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['parent_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('loans',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('book_id', sa.Integer(), nullable=False),
    sa.Column('student_id', sa.Integer(), nullable=False),
    sa.Column('borrowed_on', sa.Date(), nullable=False),
    sa.Column('due_on', sa.Date(), nullable=False),
    sa.Column('returned_on', sa.Date(), nullable=True),
    sa.ForeignKeyConstraint(['book_id'], ['books.id'], ),
    sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('payments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('student_id', sa.Integer(), nullable=False),
    sa.Column('amount', sa.Integer(), nullable=False),
    sa.Column('phone', sa.String(length=20), nullable=False),
    sa.Column('status', sa.String(length=10), nullable=False),
    sa.Column('receipt', sa.String(length=40), nullable=True),
    sa.Column('checkout_id', sa.String(length=80), nullable=True),
    sa.Column('method', sa.String(length=20), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('checkout_id')
    )
    op.create_table('portfolio_items',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('student_id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=120), nullable=False),
    sa.Column('learning_area', sa.String(length=60), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('image_url', sa.String(length=255), nullable=False),
    sa.Column('teacher_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
    sa.ForeignKeyConstraint(['teacher_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('term_reports',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('student_id', sa.Integer(), nullable=False),
    sa.Column('term', sa.String(length=20), nullable=False),
    sa.Column('competencies', sa.JSON(), nullable=True),
    sa.Column('values', sa.JSON(), nullable=True),
    sa.Column('co_curricular', sa.Text(), nullable=True),
    sa.Column('teacher_comment', sa.Text(), nullable=True),
    sa.Column('head_comment', sa.Text(), nullable=True),
    sa.Column('closing_date', sa.Date(), nullable=True),
    sa.Column('opening_date', sa.Date(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('student_id', 'term')
    )
    op.create_table('transport_logs',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('student_id', sa.Integer(), nullable=False),
    sa.Column('route_id', sa.Integer(), nullable=False),
    sa.Column('event', sa.String(length=10), nullable=False),
    sa.Column('recorded_at', sa.DateTime(), nullable=True),
    sa.Column('driver_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['driver_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['route_id'], ['transport_routes.id'], ),
    sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('students', schema=None) as batch_op:
        batch_op.add_column(sa.Column('upi', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('assessment_number', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('emergency_contact_name', sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column('emergency_contact_phone', sa.String(length=20), nullable=True))

    with op.batch_alter_table('transport_routes', schema=None) as batch_op:
        batch_op.add_column(sa.Column('driver_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_transport_routes_driver_id_users', 'users', ['driver_id'], ['id'])


def downgrade():
    with op.batch_alter_table('transport_routes', schema=None) as batch_op:
        batch_op.drop_constraint('fk_transport_routes_driver_id_users', type_='foreignkey')
        batch_op.drop_column('driver_id')

    with op.batch_alter_table('students', schema=None) as batch_op:
        batch_op.drop_column('emergency_contact_phone')
        batch_op.drop_column('emergency_contact_name')
        batch_op.drop_column('assessment_number')
        batch_op.drop_column('upi')

    op.drop_table('transport_logs')
    op.drop_table('term_reports')
    op.drop_table('portfolio_items')
    op.drop_table('payments')
    op.drop_table('loans')
    op.drop_table('leave_requests')
    op.drop_table('diary_entries')
    op.drop_table('authorized_pickups')
    op.drop_table('acknowledgements')
    op.drop_table('books')
