export function isAfterHours(date) {
  const hour = date.getHours();
  return hour < 6 || hour >= 21;
}
