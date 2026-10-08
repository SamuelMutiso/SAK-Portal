export function showValue(value, scale) {
  if (value === null || value === undefined) return "-";
  return scale === "marks" ? `${value}%` : `${Number(value).toFixed(1)} pts`;
}

export function changeText(change) {
  if (change === null || change === undefined) return null;
  return change > 0 ? `+${change}` : `${change}`;
}
