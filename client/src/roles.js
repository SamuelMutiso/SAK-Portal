export function homePath(role) {
  return role === "superadmin" ? "/owner" : `/${role}`;
}

export const ROLE_LABELS = {
  superadmin: "System owner",
  director: "School Director",
  admin: "Administrator",
  exams: "Exams officer",
  bursar: "Bursar",
  teacher: "Teacher",
  parent: "Parent",
  driver: "Bus driver",
};

export function feesBase(role) {
  return role === "bursar" ? "/bursar" : `/${role}/fees`;
}
