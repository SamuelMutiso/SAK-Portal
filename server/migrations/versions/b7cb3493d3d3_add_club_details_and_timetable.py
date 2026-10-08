"""add club details and timetable

Revision ID: b7cb3493d3d3
Revises: d2b95d6b5d03
Create Date: 2026-10-08 13:50:57.105912

"""
from alembic import op
import sqlalchemy as sa


revision = 'b7cb3493d3d3'
down_revision = 'd2b95d6b5d03'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('club_activities',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('club_id', sa.Integer(), nullable=False),
    sa.Column('date', sa.Date(), nullable=False),
    sa.Column('title', sa.String(length=150), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.ForeignKeyConstraint(['club_id'], ['clubs.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('timetable_slots',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('classroom_id', sa.Integer(), nullable=False),
    sa.Column('day', sa.Integer(), nullable=False),
    sa.Column('period', sa.Integer(), nullable=False),
    sa.Column('subject', sa.String(length=60), nullable=False),
    sa.ForeignKeyConstraint(['classroom_id'], ['classrooms.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('classroom_id', 'day', 'period')
    )
    with op.batch_alter_table('clubs', schema=None) as batch_op:
        batch_op.add_column(sa.Column('venue', sa.String(length=80), nullable=True))
        batch_op.add_column(sa.Column('leader_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_clubs_leader_id_students', 'students', ['leader_id'], ['id'])


def downgrade():
    with op.batch_alter_table('clubs', schema=None) as batch_op:
        batch_op.drop_constraint('fk_clubs_leader_id_students', type_='foreignkey')
        batch_op.drop_column('leader_id')
        batch_op.drop_column('venue')

    op.drop_table('timetable_slots')
    op.drop_table('club_activities')
