from app.curriculum import LEVEL_POINTS, TERMS, term_label, term_year, uses_marks
from app.models import Assessment
from app.models.assessment import EXAMS, level_for

STEPS = [(term, exam) for term in TERMS for exam in EXAMS]


def step_label(step):
    return term_label(*step)


def same_year(steps, step):
    return [item for item in steps if term_year(item[0]) == term_year(step[0]) and STEPS.index(item) <= STEPS.index(step)]


def points_level(points):
    if points >= 3.5:
        return "EE"
    if points >= 2.5:
        return "ME"
    if points >= 1.5:
        return "AE"
    return "BE"


def grade_for(value, marked):
    if value is None:
        return None
    return level_for(value) if marked else points_level(value)


def average(values):
    values = [value for value in values if value is not None]
    return round(sum(values) / len(values), 1) if values else None


def record_value(record):
    return record.score if record.score is not None else LEVEL_POINTS.get(record.level)


def is_failing(value, marked):
    return value < 25 if marked else value < 1.5


def is_low(value, marked):
    return value < 50 if marked else value < 2.5


def big_drop(change, marked):
    return change is not None and change <= (-10 if marked else -1)


def big_rise(change, marked):
    return change is not None and change >= (10 if marked else 1)


def difference(now, before):
    if now is None or before is None:
        return None
    return round(now - before, 1)


def show(value, marked):
    if value is None:
        return "-"
    return f"{value:g}%" if marked else f"{value:g} pts"


def index_records(student_ids):
    table = {}
    if not student_ids:
        return table
    for record in Assessment.query.filter(Assessment.student_id.in_(student_ids), Assessment.term.in_(TERMS)).all():
        result = record_value(record)
        if result is not None:
            table.setdefault(record.student_id, {}).setdefault((record.term, record.exam), {})[record.subject] = result
    return table


def steps_in(table):
    present = {step for steps in table.values() for step in steps}
    return [step for step in STEPS if step in present]


def pick_step(available, term=None, exam=None):
    if term and exam and (term, exam) in available:
        return (term, exam)
    if term:
        in_term = [step for step in available if step[0] == term]
        return in_term[-1] if in_term else None
    return available[-1] if available else None


def previous_step(available, step):
    position = available.index(step)
    return available[position - 1] if position > 0 else None


def learner_mean(table, student_id, step):
    return average(table.get(student_id, {}).get(step, {}).values())


def period_mean(table, student_id, steps):
    values = [value for step in steps for value in table.get(student_id, {}).get(step, {}).values()]
    return average(values)


def class_insights(classroom, term=None, exam=None):
    marked = uses_marks(classroom.level)
    students = {student.id: student for student in classroom.students}
    table = index_records(list(students))
    available = steps_in(table)
    base = {
        "classroom_id": classroom.id,
        "classroom_name": classroom.name,
        "teacher_name": classroom.teacher.full_name if classroom.teacher else None,
        "scale": "marks" if marked else "levels",
        "steps": [{"term": step[0], "exam": step[1], "label": step_label(step)} for step in available],
    }
    step = pick_step(available, term, exam)
    if not step:
        return {**base, "empty": True, "headlines": ["No marks have been entered for this class yet."]}
    before = previous_step(available, step)
    term_steps = [item for item in available if item[0] == step[0] and STEPS.index(item) <= STEPS.index(step)]
    year_steps = same_year(available, step)

    learners = []
    for student_id, student in students.items():
        scores = table.get(student_id, {}).get(step)
        if not scores:
            continue
        earlier = table.get(student_id, {}).get(before, {}) if before else {}
        mean = average(scores.values())
        subjects = []
        for subject, result in scores.items():
            change = difference(result, earlier.get(subject))
            subjects.append({"subject": subject, "value": result, "grade": grade_for(result, marked), "change": change})
        weak = [item for item in subjects if is_low(item["value"], marked) or big_drop(item["change"], marked)]
        failed = [item for item in subjects if is_failing(item["value"], marked)]
        learners.append({
            "id": student_id,
            "full_name": student.full_name,
            "admission_number": student.admission_number,
            "mean": mean,
            "grade": grade_for(mean, marked),
            "change": difference(mean, average(earlier.values())),
            "term_mean": period_mean(table, student_id, term_steps),
            "year_mean": period_mean(table, student_id, year_steps),
            "weak_subjects": sorted(weak, key=lambda item: item["value"]),
            "failed_subjects": sorted(failed, key=lambda item: item["value"]),
        })

    learners.sort(key=lambda item: item["mean"], reverse=True)
    for position, learner in enumerate(learners, start=1):
        learner["position"] = position

    subject_names = sorted({subject for learner in learners for subject in table[learner["id"]][step]})
    subjects = []
    for subject in subject_names:
        now = average(table[sid][step].get(subject) for sid in (learner["id"] for learner in learners))
        then = average(table.get(sid, {}).get(before, {}).get(subject) for sid in students) if before else None
        weak_count = sum(1 for learner in learners if any(item["subject"] == subject for item in learner["weak_subjects"]))
        subjects.append({
            "subject": subject,
            "mean": now,
            "grade": grade_for(now, marked),
            "change": difference(now, then),
            "term_mean": average(table.get(sid, {}).get(item, {}).get(subject) for sid in students for item in term_steps),
            "below_expectation": weak_count,
        })
    subjects.sort(key=lambda item: item["mean"], reverse=True)

    exam_mean = average(learner["mean"] for learner in learners)
    previous_mean = average(learner_mean(table, sid, before) for sid in students) if before else None
    term_mean = average(learner["term_mean"] for learner in learners)
    year_mean = average(learner["year_mean"] for learner in learners)
    improved = [learner for learner in sorted(learners, key=lambda item: item["change"] or 0, reverse=True) if (learner["change"] or 0) > 0]
    declined = [learner for learner in sorted(learners, key=lambda item: item["change"] or 0) if (learner["change"] or 0) < 0]
    failed = [learner for learner in learners if learner["failed_subjects"]]
    attention = sorted((learner for learner in learners if learner["weak_subjects"]), key=lambda item: (-len(item["weak_subjects"]), item["mean"]))
    distribution = {grade: sum(1 for learner in learners if learner["grade"] == grade) for grade in ("EE", "ME", "AE", "BE")}

    headlines = [f"Class mean for {step_label(step)} is {show(exam_mean, marked)} ({grade_for(exam_mean, marked)})"
                 + (f", {'up' if (exam_mean - previous_mean) >= 0 else 'down'} {abs(round(exam_mean - previous_mean, 1)):g} from {step_label(before)}." if previous_mean is not None else ".")]
    if subjects:
        headlines.append(f"Best subject: {subjects[0]['subject']} ({show(subjects[0]['mean'], marked)}). Weakest: {subjects[-1]['subject']} ({show(subjects[-1]['mean'], marked)}).")
    if improved:
        headlines.append(f"Most improved: {improved[0]['full_name']} (+{improved[0]['change']:g}).")
    if failed:
        headlines.append(f"{len(failed)} learner{'s' if len(failed) != 1 else ''} scored below expectation (BE) in at least one subject.")
    if attention:
        headlines.append(f"{len(attention)} learner{'s need' if len(attention) != 1 else ' needs'} attention in one or more subjects.")

    return {
        **base,
        "empty": False,
        "term": step[0],
        "exam": step[1],
        "label": step_label(step),
        "previous_label": step_label(before) if before else None,
        "learners_assessed": len(learners),
        "exam_mean": exam_mean,
        "exam_grade": grade_for(exam_mean, marked),
        "previous_mean": previous_mean,
        "term_mean": term_mean,
        "term_grade": grade_for(term_mean, marked),
        "year_mean": year_mean,
        "year_grade": grade_for(year_mean, marked),
        "subjects": subjects,
        "best_subjects": subjects[:3],
        "weakest_subjects": subjects[::-1][:3],
        "top": learners[:5],
        "most_improved": improved[:5],
        "declined": declined[:5],
        "failed": failed,
        "needs_attention": attention,
        "distribution": distribution,
        "headlines": headlines,
    }


def student_insights(student, term=None, exam=None):
    classroom = student.classroom
    marked = uses_marks(classroom.level) if classroom else True
    classmates = [item.id for item in classroom.students] if classroom else [student.id]
    table = index_records(classmates)
    mine = {student.id: table.get(student.id, {})}
    available = steps_in(mine)
    base = {"student_id": student.id, "full_name": student.full_name, "scale": "marks" if marked else "levels",
            "steps": [{"term": step[0], "exam": step[1], "label": step_label(step)} for step in available]}
    step = pick_step(available, term, exam)
    if not step:
        return {**base, "empty": True, "headlines": [f"No marks have been entered for {student.first_name} yet."]}
    before = previous_step(available, step)
    scores = table[student.id][step]
    earlier = table[student.id].get(before, {}) if before else {}
    term_steps = [item for item in available if item[0] == step[0] and STEPS.index(item) <= STEPS.index(step)]
    year_steps = same_year(available, step)

    subjects = []
    for subject, result in scores.items():
        class_mean = average(table.get(sid, {}).get(step, {}).get(subject) for sid in classmates)
        subjects.append({
            "subject": subject,
            "value": result,
            "grade": grade_for(result, marked),
            "change": difference(result, earlier.get(subject)),
            "class_mean": class_mean,
        })
    subjects.sort(key=lambda item: item["value"], reverse=True)

    mean = average(scores.values())
    ranking = sorted((learner_mean(table, sid, step) for sid in classmates if table.get(sid, {}).get(step)), reverse=True)
    needs = [item for item in subjects if is_low(item["value"], marked) or big_drop(item["change"], marked)]
    improved = [item for item in subjects if big_rise(item["change"], marked)]
    strengths = [item for item in subjects if not is_low(item["value"], marked)][:3]

    def reason(item):
        parts = [f"{show(item['value'], marked)} ({item['grade']})"]
        if item["change"] is not None and item["change"] < 0:
            parts.append(f"down {abs(item['change']):g} from {step_label(before)}")
        if item["class_mean"] is not None and item["value"] < item["class_mean"]:
            parts.append(f"class average {show(item['class_mean'], marked)}")
        return ", ".join(parts)

    for item in needs:
        item["note"] = reason(item)

    change = difference(mean, average(earlier.values()))
    headlines = [f"{student.first_name}'s average for {step_label(step)} is {show(mean, marked)} ({grade_for(mean, marked)})"
                 + (f", {'up' if change >= 0 else 'down'} {abs(change):g} from {step_label(before)}." if change is not None else ".")]
    if strengths:
        headlines.append(f"Doing well in {', '.join(item['subject'] for item in strengths)}.")
    for item in needs[:4]:
        headlines.append(f"Needs improvement in {item['subject']}: {item['note']}.")
    if improved:
        headlines.append(f"Improved in {', '.join(item['subject'] for item in improved)}.")
    if not needs and len(subjects) > 1:
        weakest = subjects[-1]
        headlines.append(f"No subject below expectation. The one to keep an eye on is {weakest['subject']} ({show(weakest['value'], marked)}).")

    return {
        **base,
        "empty": False,
        "term": step[0],
        "exam": step[1],
        "label": step_label(step),
        "previous_label": step_label(before) if before else None,
        "mean": mean,
        "grade": grade_for(mean, marked),
        "change": change,
        "position": ranking.index(mean) + 1 if mean in ranking else None,
        "class_size": len(ranking),
        "term_mean": period_mean(table, student.id, term_steps),
        "term_grade": grade_for(period_mean(table, student.id, term_steps), marked),
        "year_mean": period_mean(table, student.id, year_steps),
        "year_grade": grade_for(period_mean(table, student.id, year_steps), marked),
        "subjects": subjects,
        "strengths": strengths,
        "needs_improvement": needs,
        "improved": improved,
        "headlines": headlines,
    }


def compare_classes(classrooms, term=None, exam=None):
    tables = {classroom.id: index_records([student.id for student in classroom.students]) for classroom in classrooms}
    shared = None
    for table in tables.values():
        steps = set(steps_in(table))
        shared = steps if shared is None else shared & steps
    common = [step for step in STEPS if step in (shared or set())]
    step = pick_step(common, term, exam)

    results = []
    for classroom in classrooms:
        marked = uses_marks(classroom.level)
        table = tables[classroom.id]
        ids = [student.id for student in classroom.students]
        trend_steps = [item for item in STEPS if not step or term_year(item[0]) == term_year(step[0])]
        trend = [{"label": step_label(item), "mean": average(learner_mean(table, sid, item) for sid in ids)} for item in trend_steps if any(table.get(sid, {}).get(item) for sid in ids)]
        entry = {"classroom_id": classroom.id, "name": classroom.name, "level": classroom.level,
                 "teacher_name": classroom.teacher.full_name if classroom.teacher else None,
                 "scale": "marks" if marked else "levels", "learners": len(ids), "trend": trend}
        if step:
            means = [value for value in (learner_mean(table, sid, step) for sid in ids) if value is not None]
            mean = average(means)
            subject_names = sorted({subject for sid in ids for subject in table.get(sid, {}).get(step, {})})
            subjects = {subject: average(table.get(sid, {}).get(step, {}).get(subject) for sid in ids) for subject in subject_names}
            term_steps = [item for item in common if item[0] == step[0] and STEPS.index(item) <= STEPS.index(step)]
            year_steps = same_year(common, step)
            entry.update({
                "mean": mean,
                "grade": grade_for(mean, marked),
                "term_mean": average(period_mean(table, sid, term_steps) for sid in ids),
                "year_mean": average(period_mean(table, sid, year_steps) for sid in ids),
                "assessed": len(means),
                "meeting_expectation": round(sum(1 for value in means if not is_low(value, marked)) / len(means) * 100) if means else 0,
                "distribution": {grade: sum(1 for value in means if grade_for(value, marked) == grade) for grade in ("EE", "ME", "AE", "BE")},
                "subjects": subjects,
                "best_subject": max(subjects, key=subjects.get) if subjects else None,
                "weakest_subject": min(subjects, key=subjects.get) if subjects else None,
            })
        results.append(entry)

    subject_sets = [set(item.get("subjects", {})) for item in results]
    common_subjects = sorted(set.intersection(*subject_sets)) if subject_sets else []
    scales = {item["scale"] for item in results}
    return {
        "term": step[0] if step else None,
        "exam": step[1] if step else None,
        "label": step_label(step) if step else None,
        "steps": [{"term": item[0], "exam": item[1], "label": step_label(item)} for item in common],
        "same_scale": len(scales) == 1,
        "common_subjects": common_subjects,
        "classes": results,
    }
