import { useState } from "react";
import { useSelector } from "react-redux";
import { Outlet, useLocation } from "react-router-dom";
import AssistantBubble from "../components/AssistantBubble";
import { ASSISTANT_ROLES } from "../components/AssistantChat";
import ConsentGate from "../components/ConsentGate";
import PasswordGate from "../components/PasswordGate";
import TwoFactorSetup from "../components/TwoFactorSetup";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

export default function DashboardLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const user = useSelector((state) => state.auth.user);
  const { pathname } = useLocation();
  const ready = !user.consent_required && !user.must_change_password && !user.two_factor_setup_required;

  return (
    <div className="flex min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar onMenuClick={() => setMenuOpen(true)} />
        <main className={`mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 print:p-0 ${ready && ASSISTANT_ROLES.includes(user.role) && !pathname.endsWith("/assistant") ? "pb-24" : ""}`}>
          {user.consent_required ? <ConsentGate /> : user.must_change_password ? <PasswordGate /> : user.two_factor_setup_required ? <TwoFactorSetup required /> : <Outlet />}
        </main>
        {ready && <AssistantBubble />}
      </div>
    </div>
  );
}
