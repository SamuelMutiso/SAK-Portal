import { LogOut, Menu } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../store/slices/authSlice";

const ROLE_LABELS = { admin: "Administrator", teacher: "Teacher", parent: "Parent" };

export default function Navbar({ onMenuClick }) {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  function handleLogout() {
    dispatch(logout());
    navigate("/login");
  }

  return (
    <header className="print:hidden sticky top-0 z-20 flex items-center gap-3 border-b border-brand-100 bg-cream/90 px-4 py-3 backdrop-blur md:px-8">
      <button onClick={onMenuClick} className="rounded-lg p-2 hover:bg-brand-100 md:hidden" aria-label="Open menu">
        <Menu size={22} />
      </button>
      <div className="ml-auto flex items-center gap-3">
        <div className="text-right leading-tight">
          <p className="text-sm font-bold">{user.full_name}</p>
          <p className="text-xs text-brand-500">{ROLE_LABELS[user.role]}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-700 font-display font-bold text-white">
          {user.full_name.charAt(0)}
        </div>
        <button onClick={handleLogout} className="rounded-lg p-2 text-brand-500 hover:bg-brand-100" aria-label="Log out">
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}
