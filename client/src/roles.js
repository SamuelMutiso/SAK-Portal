export function homePath(role) {
  return role === "superadmin" ? "/owner" : `/${role}`;
}

export const ROLE_LABELS = {
  superadmin: "System owner",
  director: "School Director",
  admin: "Administrator",
  exams: "Exams officer",
  teacher: "Teacher",
  parent: "Parent",
  driver: "Bus driver",
};
