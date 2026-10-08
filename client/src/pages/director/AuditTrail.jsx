import { format } from "date-fns";
import { Download, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api/client";
import AuditEntry from "../../components/AuditEntry";
import Loader from "../../components/Loader";

const TABS = [
  { key: "", label: "Everything" },
  { key: "change", label: "Changes" },
  { key: "login", label: "Sign-ins" },
  { key: "login_failed", label: "Failed sign-ins" },
  { key: "blocked", label: "Blocked" },
];

const ROLES = [
  { key: "", label: "Everyone" },
  { key: "admin", label: "Admins" },
  { key: "teacher", label: "Teachers" },
  { key: "parent", label: "Parents" },
  { key: "driver", label: "Drivers" },
];

function toCsv(entries) {
  const rows = [["Time", "Person", "Role", "Action", "What changed", "IP address", "Location", "Device"]];
  entries.forEach((entry) => {
    const changes = (entry.changes || [])
      .map((change) => `${change.type} ${change.item}: ${Object.entries(change.fields).map(([key, value]) => (value && typeof value === "object" && "from" in value ? `${key} ${value.from} -> ${value.to}` : `${key} ${JSON.stringify(value)}`)).join("; ")}`)
      .join(" | ");
    rows.push([format(new Date(entry.created_at + "Z"), "yyyy-MM-dd HH:mm"), entry.user_name, entry.user_role, entry.action, changes, entry.ip_address, entry.location, entry.device]);
  });
  return rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
}

export default function AuditTrail() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({ kind: "", role: "", search: "", from: "", to: "", user_id: searchParams.get("user") || "", page: 1 });
  const [data, setData] = useState(null);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setFilters((current) => ({ ...current, search: searchText, page: 1 })), 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ""));
    setData(null);
    api.get("/director/audit", { params }).then(({ data: result }) => setData(result));
  }, [filters]);

  function update(field, value) {
    setFilters({ ...filters, [field]: value, page: 1 });
  }

  function download() {
    const blob = new Blob([toCsv(data.entries)], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `audit-trail-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 className="page-title">Audit trail</h1>
          <p className="mt-2 max-w-2xl text-brand-500">Every change, sign-in and blocked attempt. Records can&apos;t be edited or deleted by anyone. Tap a record to see exactly what changed.</p>
        </div>
        <button className="btn-ghost" onClick={download} disabled={!data?.entries.length}><Download size={16} /> Download CSV</button>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-brand-50 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => update("kind", tab.key)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${filters.kind === tab.key ? "bg-white text-brand-800 shadow-sm" : "text-brand-500"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
          <input className="input pl-10" placeholder="Search a name, learner, IP address or change" value={searchText} onChange={(event) => setSearchText(event.target.value)} />
        </div>
        <select className="input" value={filters.role} onChange={(event) => update("role", event.target.value)} aria-label="Role">
          {ROLES.map((role) => <option key={role.key} value={role.key}>{role.label}</option>)}
        </select>
        <input type="date" className="input" value={filters.from} onChange={(event) => update("from", event.target.value)} aria-label="From date" />
        <input type="date" className="input" value={filters.to} onChange={(event) => update("to", event.target.value)} aria-label="To date" />
      </div>

      {filters.user_id && (
        <p className="flex items-center gap-3 rounded-xl bg-gold-100 px-4 py-2 text-sm text-brand-800">
          Showing one staff member&apos;s activity.
          <button className="font-semibold underline" onClick={() => update("user_id", "")}>Show everyone</button>
        </p>
      )}

      {!data ? (
        <Loader />
      ) : (
        <>
          <p className="text-sm text-brand-500">{data.total} records</p>
          <ul className="space-y-2">
            {data.entries.map((entry) => <AuditEntry key={entry.id} entry={entry} />)}
          </ul>
          {data.pages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button className="btn-ghost" disabled={data.page <= 1} onClick={() => setFilters({ ...filters, page: data.page - 1 })}>Newer</button>
              <span className="text-sm text-brand-500">Page {data.page} of {data.pages}</span>
              <button className="btn-ghost" disabled={data.page >= data.pages} onClick={() => setFilters({ ...filters, page: data.page + 1 })}>Older</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
