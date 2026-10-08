"""initial schema

Revision ID: 555fef3393c6
Revises: 
Create Date: 2026-10-08 11:43:41.611981

"""
from alembic import op
import sqlalchemy as sa


revision = '555fef3393c6'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('events',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=150), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('category', sa.String(length=20), nullable=True),
    sa.Column('location', sa.String(length=120), nullable=True),
    sa.Column('start_date', sa.Date(), nullable=False),
    sa.Column('end_date', sa.Date(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('transport_routes',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=80), nullable=False),
    sa.Column('driver_name', sa.String(length=120), nullable=True),
    sa.Column('driver_phone', sa.String(length=20), nullable=True),
    sa.Column('vehicle', sa.String(length=40), nullable=True),
    sa.Column('stops', sa.JSON(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('full_name', sa.String(length=120), nullable=False),
    sa.Column('email', sa.String(length=120), nullable=False),
    sa.Column('phone', sa.String(length=20), nullable=False),
    sa.Column('role', sa.String(length=20), nullable=False),
    sa.Column('password_hash', sa.String(length=128), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email')
    )
    op.create_table('classrooms',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=40), nullable=False),
    sa.Column('level', sa.String(length=40), nullable=False),
    sa.Column('teacher_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['teacher_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('clubs',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=80), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('meeting_day', sa.String(length=20), nullable=True),
    sa.Column('patron_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['patron_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('homework',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('classroom_id', sa.Integer(), nullable=False),
    sa.Column('subject', sa.String(length=60), nullable=False),
    sa.Column('title', sa.String(length=150), nullable=False),
    sa.Column('details', sa.Text(), nullable=True),
    sa.Column('due_date', sa.Date(), nullable=False),
    sa.Column('teacher_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['classroom_id'], ['classrooms.id'], ),
    sa.ForeignKeyConstraint(['teacher_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('notices',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=150), nullable=False),
    sa.Column('body', sa.Text(), nullable=False),
    sa.Column('audience', sa.String(length=20), nullable=False),
    sa.Column('classroom_id', sa.Integer(), nullable=True),
    sa.Column('club_id', sa.Integer(), nullable=True),
    sa.Column('transport_route_id', sa.Integer(), nullable=True),
    sa.Column('send_sms', sa.Boolean(), nullable=True),
    sa.Column('sms_count', sa.Integer(), nullable=True),
    sa.Column('author_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['classroom_id'], ['classrooms.id'], ),
    sa.ForeignKeyConstraint(['club_id'], ['clubs.id'], ),
    sa.ForeignKeyConstraint(['transport_route_id'], ['transport_routes.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('students',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('admission_number', sa.String(length=20), nullable=False),
    sa.Column('first_name', sa.String(length=60), nullable=False),
    sa.Column('last_name', sa.String(length=60), nullable=False),
    sa.Column('gender', sa.String(length=10), nullable=True),
    sa.Column('date_of_birth', sa.Date(), nullable=True),
    sa.Column('is_boarder', sa.Boolean(), nullable=True),
    sa.Column('classroom_id', sa.Integer(), nullable=True),
    sa.Column('parent_id', sa.Integer(), nullable=True),
    sa.Column('transport_route_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['classroom_id'], ['classrooms.id'], ),
    sa.ForeignKeyConstraint(['parent_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['transport_route_id'], ['transport_routes.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('admission_number')
    )
    op.create_table('assessments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('student_id', sa.Integer(), nullable=False),
    sa.Column('subject', sa.String(length=60), nullable=False),
    sa.Column('term', sa.String(length=20), nullable=False),
    sa.Column('level', sa.String(length=2), nullable=False),
    sa.Column('comment', sa.Text(), nullable=True),
    sa.Column('teacher_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
    sa.ForeignKeyConstraint(['teacher_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('attendance',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('student_id', sa.Integer(), nullable=False),
    sa.Column('date', sa.Date(), nullable=False),
    sa.Column('status', sa.String(length=10), nullable=False),
    sa.Column('recorded_by_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['recorded_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('student_id', 'date')
    )
    op.create_table('club_members',
    sa.Column('club_id', sa.Integer(), nullable=False),
    sa.Column('student_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['club_id'], ['clubs.id'], ),
    sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
    sa.PrimaryKeyConstraint('club_id', 'student_id')
    )


def downgrade():
    op.drop_table('club_members')
    op.drop_table('attendance')
    op.drop_table('assessments')
    op.drop_table('students')
    op.drop_table('notices')
    op.drop_table('homework')
    op.drop_table('clubs')
    op.drop_table('classrooms')
    op.drop_table('users')
    op.drop_table('transport_routes')
    op.drop_table('events')
