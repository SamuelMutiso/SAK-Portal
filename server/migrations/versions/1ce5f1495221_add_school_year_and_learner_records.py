"""add school year and learner records

Revision ID: 1ce5f1495221
Revises: 5ca61bb06203
Create Date: 2026-10-16 19:28:41.876280

"""
from alembic import op
import sqlalchemy as sa


revision = '1ce5f1495221'
down_revision = '5ca61bb06203'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('school_terms',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=20), nullable=False),
    sa.Column('year', sa.Integer(), nullable=False),
    sa.Column('number', sa.Integer(), nullable=False),
    sa.Column('start_date', sa.Date(), nullable=True),
    sa.Column('end_date', sa.Date(), nullable=True),
    sa.Column('fee_due_date', sa.Date(), nullable=True),
    sa.Column('is_current', sa.Boolean(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )
    op.create_table('promotion_runs',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('from_year', sa.Integer(), nullable=False),
    sa.Column('to_year', sa.Integer(), nullable=False),
    sa.Column('promoted', sa.Integer(), nullable=True),
    sa.Column('repeated', sa.Integer(), nullable=True),
    sa.Column('completed', sa.Integer(), nullable=True),
    sa.Column('run_by_id', sa.Integer(), nullable=True),
    sa.Column('run_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['run_by_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('from_year')
    )
    op.create_table('student_history',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('student_id', sa.Integer(), nullable=False),
    sa.Column('year', sa.Integer(), nullable=False),
    sa.Column('classroom_name', sa.String(length=40), nullable=True),
    sa.Column('outcome', sa.String(length=20), nullable=False),
    sa.Column('note', sa.String(length=300), nullable=True),
    sa.Column('recorded_by_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['recorded_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('classrooms', schema=None) as batch_op:
        batch_op.add_column(sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False))

    with op.batch_alter_table('students', schema=None) as batch_op:
        batch_op.add_column(sa.Column('status', sa.String(length=20), server_default='active', nullable=False))
        batch_op.add_column(sa.Column('admission_date', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('left_on', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('leaving_reason', sa.String(length=300), nullable=True))
        batch_op.add_column(sa.Column('last_classroom_name', sa.String(length=40), nullable=True))
        batch_op.add_column(sa.Column('home_address', sa.String(length=200), nullable=True))
        batch_op.add_column(sa.Column('previous_school', sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column('guardian_relationship', sa.String(length=30), nullable=True))
        batch_op.add_column(sa.Column('guardian2_name', sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column('guardian2_phone', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('guardian2_relationship', sa.String(length=30), nullable=True))
        batch_op.add_column(sa.Column('allergies', sa.String(length=300), nullable=True))
        batch_op.add_column(sa.Column('medical_conditions', sa.String(length=300), nullable=True))



def downgrade():
    with op.batch_alter_table('students', schema=None) as batch_op:
        batch_op.drop_column('medical_conditions')
        batch_op.drop_column('allergies')
        batch_op.drop_column('guardian2_relationship')
        batch_op.drop_column('guardian2_phone')
        batch_op.drop_column('guardian2_name')
        batch_op.drop_column('guardian_relationship')
        batch_op.drop_column('previous_school')
        batch_op.drop_column('home_address')
        batch_op.drop_column('last_classroom_name')
        batch_op.drop_column('leaving_reason')
        batch_op.drop_column('left_on')
        batch_op.drop_column('admission_date')
        batch_op.drop_column('status')

    with op.batch_alter_table('classrooms', schema=None) as batch_op:
        batch_op.drop_column('sort_order')

    op.drop_table('student_history')
    op.drop_table('promotion_runs')
    op.drop_table('school_terms')
