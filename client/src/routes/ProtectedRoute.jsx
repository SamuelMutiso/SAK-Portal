import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import { homePath } from "../roles";

export default function ProtectedRoute({ roles }) {
  const user = useSelector((state) => state.auth.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to={homePath(user.role)} replace />;
  }

  return <Outlet />;
}
