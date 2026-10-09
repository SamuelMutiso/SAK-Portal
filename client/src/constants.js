export const LEVELS = {
  EE: { label: "Exceeding Expectations", style: "bg-emerald-100 text-emerald-700" },
  ME: { label: "Meeting Expectations", style: "bg-sky-100 text-sky-700" },
  AE: { label: "Approaching Expectations", style: "bg-amber-100 text-amber-700" },
  BE: { label: "Below Expectations", style: "bg-red-100 text-red-700" },
};

export const EXAMS = ["Opener", "Mid-Term", "End-Term"];

export const YEARS = [2025, 2026, 2027];

export function currentTerm(today = new Date()) {
  const month = today.getMonth() + 1;
  const number = month <= 4 ? 1 : month <= 8 ? 2 : 3;
  const year = Math.min(Math.max(today.getFullYear(), YEARS[0]), YEARS[YEARS.length - 1]);
  return `Term ${number} ${year}`;
}

export const TERM = currentTerm();

export function termShort(term) {
  if (!term) return "";
  const [, number, year] = term.split(" ");
  return Number(year) === new Date().getFullYear() ? `Term ${number}` : `Term ${number} ${year}`;
}

export function levelForScore(score) {
  if (score >= 75) return "EE";
  if (score >= 50) return "ME";
  if (score >= 25) return "AE";
  return "BE";
}

export function formatKes(amount) {
  return `KES ${Number(amount || 0).toLocaleString("en-KE")}`;
}

export const RUBRIC_CODES = ["EE", "ME", "AE", "BE"];

export const MOODS = {
  happy: { label: "Happy", style: "bg-emerald-100 text-emerald-700" },
  calm: { label: "Calm", style: "bg-sky-100 text-sky-700" },
  tired: { label: "Tired", style: "bg-amber-100 text-amber-700" },
  upset: { label: "Upset", style: "bg-red-100 text-red-700" },
};
