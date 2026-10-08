export function nextSchoolDay() {
  const day = new Date().getDay();
  if (day === 5 || day === 6 || day === 0) return 0;
  return day;
}

export function lessonsFor(timetable, day) {
  return timetable.bells.map((bell) => {
    if (!bell.period) return { ...bell, isBreak: true };
    const slot = timetable.slots.find((item) => item.day === day && item.period === bell.period);
    return { ...bell, subject: slot?.subject };
  });
}

export function nextSchoolDayLabel(days) {
  const today = new Date().getDay();
  const index = nextSchoolDay();
  return today >= 1 && today <= 4 ? "Tomorrow" : days[index];
}
