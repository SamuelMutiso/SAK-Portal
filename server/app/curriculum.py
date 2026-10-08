LEARNING_AREAS = {
    "Pre-Primary": [
        "Language Activities",
        "Mathematics Activities",
        "Creative Activities",
        "Environmental Activities",
        "Religious Activities",
    ],
    "Lower Primary": [
        "English",
        "Kiswahili",
        "Mathematics",
        "Indigenous Language",
        "Religious Education",
        "Environmental Activities",
        "Creative Activities",
    ],
    "Upper Primary": [
        "English",
        "Kiswahili",
        "Mathematics",
        "Religious Education",
        "Science and Technology",
        "Social Studies",
        "Agriculture and Nutrition",
        "Creative Arts",
    ],
    "Junior Secondary": [
        "English",
        "Kiswahili",
        "Mathematics",
        "Religious Education",
        "Integrated Science",
        "Social Studies",
        "Agriculture and Nutrition",
        "Pre-Technical Studies",
        "Creative Arts and Sports",
    ],
}

MARKED_LEVELS = ("Upper Primary", "Junior Secondary")

SBA_CLASSES = ("Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8")

COMPETENCIES = [
    "Communication and Collaboration",
    "Critical Thinking and Problem Solving",
    "Creativity and Imagination",
    "Citizenship",
    "Digital Literacy",
    "Learning to Learn",
    "Self-Efficacy",
]

VALUES = ["Love", "Responsibility", "Respect", "Unity", "Peace", "Patriotism", "Social Justice", "Integrity"]

CURRENT_TERM = "Term 3 2026"

TERMS = ["Term 1 2026", "Term 2 2026", "Term 3 2026"]

LEVEL_POINTS = {"EE": 4, "ME": 3, "AE": 2, "BE": 1}

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

BELL_SCHEDULE = [
    {"period": 1, "start": "08:00", "end": "08:40"},
    {"period": 2, "start": "08:40", "end": "09:20"},
    {"label": "Short break", "start": "09:20", "end": "09:30"},
    {"period": 3, "start": "09:30", "end": "10:10"},
    {"period": 4, "start": "10:10", "end": "10:50"},
    {"label": "Break", "start": "10:50", "end": "11:20"},
    {"period": 5, "start": "11:20", "end": "12:00"},
    {"period": 6, "start": "12:00", "end": "12:40"},
    {"label": "Lunch", "start": "12:40", "end": "14:00"},
    {"period": 7, "start": "14:00", "end": "14:40"},
    {"period": 8, "start": "14:40", "end": "15:20"},
]

EXTRA_LESSONS = ["Physical Education", "Games", "Library", "Clubs", "Pastoral Programme"]


def learning_areas_for(level):
    return LEARNING_AREAS.get(level, [])


def uses_marks(level):
    return level in MARKED_LEVELS
