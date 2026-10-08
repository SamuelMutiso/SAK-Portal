import { useState } from "react";
import { useSelector } from "react-redux";
import { Outlet } from "react-router-dom";
import ConsentGate from "../components/ConsentGate";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

export default function DashboardLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const user = useSelector((state) => state.auth.user);

  return (
    <div className="flex min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar onMenuClick={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 print:p-0">
          {user.consent_required ? <ConsentGate /> : <Outlet />}
        </main>
      </div>
    </div>
  );
}
