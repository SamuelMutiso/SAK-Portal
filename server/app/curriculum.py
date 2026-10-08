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


def learning_areas_for(level):
    return LEARNING_AREAS.get(level, [])


def uses_marks(level):
    return level in MARKED_LEVELS
