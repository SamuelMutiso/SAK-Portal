import { LEVELS } from "../constants";

export default function GradeBadge({ grade }) {
  if (!grade) return null;
  return <span className={`badge w-10 justify-center font-mono ${LEVELS[grade].style}`} title={LEVELS[grade].label}>{grade}</span>;
}
