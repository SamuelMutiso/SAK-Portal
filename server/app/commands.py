from datetime import date, timedelta

import click

from app.models import Event


def register_commands(app):
    @app.cli.command("send-reminders")
    def send_reminders():
        from app.routes.events import remind_parents

        tomorrow = date.today() + timedelta(days=1)
        events = Event.query.filter_by(start_date=tomorrow).all()
        for event in events:
            result = remind_parents(event)
            click.echo(f"{event.title}: sent to {result['sent']} parents")
        if not events:
            click.echo("No events tomorrow")

    @app.cli.command("add-demo-learning")
    def add_demo_learning():
        from app.services.learning_demo import add_demo_materials, add_demo_quizzes

        materials = add_demo_materials()
        quizzes = add_demo_quizzes()
        click.echo(f"Added {materials} demo learning materials" if materials else "Learning materials already exist, nothing added")
        click.echo(f"Added {quizzes} demo quizzes" if quizzes else "Quizzes already exist, nothing added")
