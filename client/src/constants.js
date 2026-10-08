export const LEVELS = {
  EE: { label: "Exceeding Expectations", style: "bg-emerald-100 text-emerald-700" },
  ME: { label: "Meeting Expectations", style: "bg-sky-100 text-sky-700" },
  AE: { label: "Approaching Expectations", style: "bg-amber-100 text-amber-700" },
  BE: { label: "Below Expectations", style: "bg-red-100 text-red-700" },
};

export const SUBJECTS = ["Mathematics", "English", "Kiswahili", "Science", "Social Studies", "Creative Arts"];

export const EXAMS = ["Opener", "Mid-Term", "End-Term"];

export const TERM = "Term 3 2026";

export function levelForScore(score) {
  if (score >= 75) return "EE";
  if (score >= 50) return "ME";
  if (score >= 25) return "AE";
  return "BE";
}

export function formatKes(amount) {
  return `KES ${Number(amount || 0).toLocaleString("en-KE")}`;
}
