import { formatDistanceToNow } from "date-fns";
import { FileSignature, History, KeyRound, Power, Search, Trash2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../api/client";
import Loader from "../../components/Loader";
import { ROLE_LABELS } from "../../roles";

const FILTERS = [
  { key: "", label: "Everyone" },
  { key: "director", label: "Director" },
  { key: "admin", label: "Admins" },
  { key: "teacher", label: "Teachers" },
  { key: "parent", label: "Parents" },
  { key: "driver", label: "Drivers" },
];

const EMPTY = { full_name: "", email: "", phone: "", role: "admin", password: "" };

export default function Accounts() {
  const [accounts, setAccounts] = useState(null);
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [resetting, setResetting] = useState(null);
  const [password, setPassword] = useState("");
  const [removing, setRemoving] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      api.get("/owner/accounts", { params: { role: role || undefined, search: search || undefined } }).then(({ data }) => setAccounts(data));
    }, 300);
    return () => clearTimeout(timer);
  }, [role, search]);

  function replace(updated) {
    setAccounts(accounts.map((item) => (item.id === updated.id ? { ...item, ...updated, last_login: item.last_login, consent: item.consent } : item)));
  }

  async function update(user, payload, text) {
    try {
      const { data } = await api.patch(`/owner/accounts/${user.id}`, payload);
      replace(data);
      setMessage({ type: "success", text });
      setResetting(null);
      setPassword("");
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    }
  }

  async function remove(user) {
    try {
      const { data } = await api.delete(`/owner/accounts/${user.id}`);
      replace(data);
      setRemoving(null);
      setMessage({ type: "success", text: `${user.full_name}'s account has been removed. Their past records stay for the audit trail.` });
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    }
  }

  async function create(event) {
    event.preventDefault();
    try {
      const { data } = await api.post("/owner/accounts", form);
      setAccounts([data, ...accounts]);
      setForm(EMPTY);
      setAdding(false);
      setMessage({ type: "success", text: `Account created for ${data.full_name}. They will be asked to accept the policies when they first sign in.` });
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 className="page-title">Accounts</h1>
          <p className="mt-2 max-w-2xl text-brand-500">Every account in the portal, parents included. Switching off or removing an account signs that person out everywhere straight away.</p>
        </div>
        <button className="btn-primary" onClick={() => setAdding(!adding)}><UserPlus size={16} /> Add account</button>
      </div>

      {adding && (
        <form onSubmit={create} className="card grid gap-3 md:grid-cols-3">
          <input className="input" placeholder="Full name" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} required />
          <input className="input" type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          <input className="input" placeholder="Phone, e.g. 0712345678" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
          <select className="input" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
            {["director", "admin", "teacher", "driver", "parent"].map((item) => <option key={item} value={item}>{ROLE_LABELS[item]}</option>)}
          </select>
          <input className="input font-mono" placeholder="Temporary password (8+)" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength={8} required />
          <button className="btn-primary">Create account</button>
        </form>
      )}

      {message && (
        <p className={`rounded-xl px-4 py-3 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>
      )}

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
          <input className="input pl-10" placeholder="Search name, email or phone" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-brand-50 p-1">
          {FILTERS.map((item) => (
            <button key={item.key} onClick={() => setRole(item.key)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold ${role === item.key ? "bg-white text-brand-800 shadow-sm" : "text-brand-500"}`}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {!accounts ? (
        <Loader />
      ) : (
        <div className="card divide-y divide-brand-50 p-0">
          {accounts.map((user) => (
            <div key={user.id} className={`px-5 py-4 ${user.removed_at ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-56 flex-1">
                  <p className="font-semibold text-brand-800">
                    {user.full_name}
                    <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-500">{ROLE_LABELS[user.role]}</span>
                    {user.removed_at && <span className="ml-2 rounded-full bg-brand-800 px-2 py-0.5 text-xs font-semibold text-white">Removed</span>}
                    {!user.removed_at && !user.is_active && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Switched off</span>}
                  </p>
                  <p className="text-xs text-brand-400">
                    {user.email} · <span className="font-mono">{user.phone}</span> · {user.last_login ? `signed in ${formatDistanceToNow(new Date(user.last_login + "Z"), { addSuffix: true })}` : "no sign-ins recorded"}
                  </p>
                  {user.role !== "superadmin" && (
                    <p className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${user.consent ? "text-emerald-700" : "text-amber-700"}`}>
                      <FileSignature size={13} />
                      {user.consent
                        ? `Accepted policies ${formatDistanceToNow(new Date(user.consent.accepted_at + "Z"), { addSuffix: true })}, signed "${user.consent.signature}"${user.role === "parent" ? `, photos ${user.consent.photo_consent ? "allowed" : "not allowed"}` : ""}`
                        : "Has not accepted the policies yet"}
                    </p>
                  )}
                </div>
                {user.role !== "superadmin" && !user.removed_at && (
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/owner/audit?user=${user.id}`} className="btn-ghost px-3 py-1.5"><History size={15} /> Activity</Link>
                    <button className="btn-ghost px-3 py-1.5" onClick={() => setResetting(resetting === user.id ? null : user.id)}><KeyRound size={15} /> Password</button>
                    <button
                      className={`btn px-3 py-1.5 ${user.is_active ? "bg-amber-50 text-amber-800 hover:bg-amber-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                      onClick={() => update(user, { is_active: !user.is_active }, user.is_active ? `${user.full_name} has been switched off and signed out.` : `${user.full_name} can sign in again.`)}
                    >
                      <Power size={15} /> {user.is_active ? "Switch off" : "Switch on"}
                    </button>
                    <button className="btn bg-red-50 px-3 py-1.5 text-red-700 hover:bg-red-100" onClick={() => setRemoving(removing === user.id ? null : user.id)}><Trash2 size={15} /> Remove</button>
                  </div>
                )}
              </div>
              {resetting === user.id && (
                <form className="mt-3 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); update(user, { password }, `New password set for ${user.full_name}.`); }}>
                  <input type="text" className="input max-w-xs font-mono" placeholder="New password (8+ characters)" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
                  <button className="btn-primary">Set password</button>
                </form>
              )}
              {removing === user.id && (
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
                  <p className="flex-1">Remove {user.full_name}? They can never sign in again and their email is freed. Grades, notices and other records they made stay, with their name, for the audit trail.</p>
                  <button className="btn bg-red-600 text-white hover:bg-red-700" onClick={() => remove(user)}>Remove account</button>
                  <button className="btn-ghost" onClick={() => setRemoving(null)}>Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
