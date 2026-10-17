"""add quizzes

Revision ID: b132caa17f7b
Revises: 06c95ecae9aa
Create Date: 2026-10-17 18:26:32.148521

"""
from alembic import op
import sqlalchemy as sa


revision = 'b132caa17f7b'
down_revision = '06c95ecae9aa'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('quizzes',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('classroom_id', sa.Integer(), nullable=False),
    sa.Column('purpose', sa.String(length=10), nullable=False),
    sa.Column('subject', sa.String(length=60), nullable=False),
    sa.Column('topic', sa.String(length=120), nullable=True),
    sa.Column('title', sa.String(length=150), nullable=False),
    sa.Column('instructions', sa.Text(), nullable=True),
    sa.Column('time_limit', sa.Integer(), nullable=True),
    sa.Column('is_published', sa.Boolean(), nullable=False),
    sa.Column('teacher_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['classroom_id'], ['classrooms.id'], ),
    sa.ForeignKeyConstraint(['teacher_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('quiz_attempts',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('quiz_id', sa.Integer(), nullable=False),
    sa.Column('student_id', sa.Integer(), nullable=True),
    sa.Column('candidate_name', sa.String(length=120), nullable=True),
    sa.Column('candidate_phone', sa.String(length=20), nullable=True),
    sa.Column('taken_by_id', sa.Integer(), nullable=False),
    sa.Column('answers', sa.JSON(), nullable=True),
    sa.Column('score', sa.Integer(), nullable=True),
    sa.Column('total', sa.Integer(), nullable=True),
    sa.Column('late', sa.Boolean(), nullable=False),
    sa.Column('started_at', sa.DateTime(), nullable=False),
    sa.Column('submitted_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['quiz_id'], ['quizzes.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
    sa.ForeignKeyConstraint(['taken_by_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('quiz_questions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('quiz_id', sa.Integer(), nullable=False),
    sa.Column('position', sa.Integer(), nullable=False),
    sa.Column('kind', sa.String(length=10), nullable=False),
    sa.Column('prompt', sa.Text(), nullable=False),
    sa.Column('options', sa.JSON(), nullable=True),
    sa.Column('answer', sa.String(length=500), nullable=False),
    sa.Column('explanation', sa.Text(), nullable=True),
    sa.Column('points', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['quiz_id'], ['quizzes.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('quiz_questions')
    op.drop_table('quiz_attempts')
    op.drop_table('quizzes')
