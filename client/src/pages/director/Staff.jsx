import { formatDistanceToNow } from "date-fns";
import { History, KeyRound, Power } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../api/client";
import Loader from "../../components/Loader";

const ROLE_LABELS = { superadmin: "Director", admin: "Admin", teacher: "Teacher", driver: "Driver" };

export default function Staff() {
  const [staff, setStaff] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api.get("/director/staff").then(({ data }) => setStaff(data));
  }, []);

  async function update(user, payload, text) {
    try {
      const { data } = await api.patch(`/director/staff/${user.id}`, payload);
      setStaff(staff.map((item) => (item.id === user.id ? { ...item, ...data } : item)));
      setMessage({ type: "success", text });
      setResetting(null);
      setPassword("");
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    }
  }

  if (!staff) return <Loader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Staff accounts</h1>
        <p className="mt-2 max-w-2xl text-brand-500">Switch off an account and that person is signed out everywhere straight away. Admins cannot see or change director accounts.</p>
      </div>

      {message && (
        <p className={`rounded-xl px-4 py-3 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>
      )}

      <div className="card divide-y divide-brand-50 p-0">
        {staff.map((user) => (
          <div key={user.id} className="px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-48 flex-1">
                <p className="font-semibold text-brand-800">
                  {user.full_name}
                  <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-500">{ROLE_LABELS[user.role]}</span>
                  {!user.is_active && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Switched off</span>}
                </p>
                <p className="text-xs text-brand-400">
                  {user.email} · <span className="font-mono">{user.phone}</span> · {user.last_login ? `last signed in ${formatDistanceToNow(new Date(user.last_login + "Z"), { addSuffix: true })}` : "never signed in"}
                </p>
              </div>
              {user.role !== "superadmin" && (
                <div className="flex flex-wrap gap-2">
                  <Link to={`/director/audit?user=${user.id}`} className="btn-ghost px-3 py-1.5"><History size={15} /> Activity</Link>
                  <button className="btn-ghost px-3 py-1.5" onClick={() => setResetting(resetting === user.id ? null : user.id)}><KeyRound size={15} /> Reset password</button>
                  <button
                    className={`btn px-3 py-1.5 ${user.is_active ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                    onClick={() => update(user, { is_active: !user.is_active }, user.is_active ? `${user.full_name} has been switched off and signed out.` : `${user.full_name} can sign in again.`)}
                  >
                    <Power size={15} /> {user.is_active ? "Switch off" : "Switch on"}
                  </button>
                </div>
              )}
            </div>
            {resetting === user.id && (
              <form
                className="mt-3 flex flex-wrap gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  update(user, { password }, `New password set for ${user.full_name}.`);
                }}
              >
                <input type="text" className="input max-w-xs font-mono" placeholder="New password (8+ characters)" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
                <button className="btn-primary">Set password</button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
