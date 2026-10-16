export function passwordProblem(password) {
  if (password.length < 8) return "Use at least 8 characters";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Use both letters and numbers";
  return null;
}
