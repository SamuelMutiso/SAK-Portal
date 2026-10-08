import { format } from "date-fns";
import { Ban, ChevronDown, KeyRound, LogIn, Monitor, MoonStar, Pencil, ShieldAlert, Smartphone } from "lucide-react";
import { useState } from "react";
import { isAfterHours } from "../audit";

const KINDS = {
  change: { label: "Change", icon: Pencil, style: "bg-brand-100 text-brand-700" },
  login: { label: "Signed in", icon: LogIn, style: "bg-emerald-100 text-emerald-700" },
  login_failed: { label: "Failed sign-in", icon: KeyRound, style: "bg-red-100 text-red-700" },
  blocked: { label: "Blocked", icon: Ban, style: "bg-amber-100 text-amber-800" },
};

const ROLE_LABELS = { superadmin: "Director", admin: "Admin", teacher: "Teacher", parent: "Parent", driver: "Driver" };

const SKIP_FIELDS = ["student_id", "teacher_id", "author_id", "classroom_id", "club_id", "parent_id", "recorded_by_id", "driver_id", "route_id", "transport_route_id", "user_id", "item_id", "checkout_id"];

function fieldName(key) {
  const text = key.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function show(value) {
  if (value === null || value === undefined || value === "") return "empty";
  if (Array.isArray(value)) return value.join(", ") || "none";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ChangeList({ changes }) {
  return (
    <ul className="space-y-3">
      {changes.map((change, index) => (
        <li key={index} className="rounded-xl bg-white p-3 ring-1 ring-brand-100">
          <p className="text-sm font-semibold text-brand-800">
            <span className={`mr-2 rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase ${change.type === "deleted" ? "bg-red-100 text-red-700" : change.type === "created" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}>
              {change.type}
            </span>
            {change.table}: {change.item}
          </p>
          <dl className="mt-2 space-y-1 text-xs">
            {Object.entries(change.fields)
              .filter(([key]) => change.type !== "created" || !SKIP_FIELDS.includes(key))
              .slice(0, change.type === "created" ? 8 : 20)
              .map(([key, value]) => (
                <div key={key} className="flex flex-wrap gap-x-2">
                  <dt className="text-brand-400">{fieldName(key)}:</dt>
                  {value && typeof value === "object" && "from" in value ? (
                    <dd>
                      <span className="rounded bg-red-50 px-1 font-mono text-red-700 line-through">{show(value.from)}</span>
                      <span className="mx-1 text-brand-400">→</span>
                      <span className="rounded bg-emerald-50 px-1 font-mono font-semibold text-emerald-700">{show(value.to)}</span>
                    </dd>
                  ) : value && typeof value === "object" && "added" in value ? (
                    <dd>
                      {value.added.length > 0 && <span className="text-emerald-700">added {value.added.join(", ")} </span>}
                      {value.removed.length > 0 && <span className="text-red-700">removed {value.removed.join(", ")}</span>}
                    </dd>
                  ) : (
                    <dd className="font-mono text-brand-700">{show(value)}</dd>
                  )}
                </div>
              ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}

export default function AuditEntry({ entry, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const kind = KINDS[entry.kind];
  const Icon = kind.icon;
  const when = new Date(entry.created_at + "Z");
  const mobile = /phone|iPad/i.test(entry.device || "");
  const summary = entry.changes?.[0];

  return (
    <li className={`rounded-2xl bg-white ring-1 ${entry.kind === "blocked" || entry.kind === "login_failed" ? "ring-red-100" : "ring-brand-100"}`}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-start gap-3 p-4 text-left" aria-expanded={open}>
        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${kind.style}`}><Icon size={16} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-brand-800">
            {entry.user_name || "Unknown person"}
            {entry.user_role && <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-500">{ROLE_LABELS[entry.user_role] || entry.user_role}</span>}
          </p>
          <p className="text-sm text-brand-600">
            {entry.action}
            {summary && entry.kind === "change" && <span className="text-brand-400"> · {summary.item}</span>}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-400">
            <span>{format(when, "EEE d MMM, h:mm a")}</span>
            {isAfterHours(when) && <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 font-semibold text-violet-700"><MoonStar size={11} /> After hours</span>}
            <span className="inline-flex items-center gap-1">{mobile ? <Smartphone size={12} /> : <Monitor size={12} />} {entry.device}</span>
            <span className="font-mono">{entry.ip_address}</span>
            <span>{entry.location}</span>
          </p>
        </div>
        <ChevronDown size={18} className={`mt-2 shrink-0 text-brand-300 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-brand-50 bg-brand-50/60 p-4">
          {entry.changes?.length > 0 ? (
            <ChangeList changes={entry.changes} />
          ) : (
            <p className="flex items-center gap-2 text-sm text-brand-500">
              <ShieldAlert size={16} /> {entry.kind === "blocked" ? "The system refused this action, so nothing was changed." : "No data was changed."}
            </p>
          )}
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <div><dt className="text-brand-400">IP address</dt><dd className="font-mono text-brand-800">{entry.ip_address}</dd></div>
            <div><dt className="text-brand-400">Approximate location</dt><dd className="text-brand-800">{entry.location}</dd></div>
            <div className="sm:col-span-2"><dt className="text-brand-400">Browser details</dt><dd className="break-all font-mono text-brand-700">{entry.user_agent || "Not sent"}</dd></div>
            <div><dt className="text-brand-400">Request</dt><dd className="font-mono text-brand-700">{entry.method} {entry.path} · {entry.status}</dd></div>
            <div><dt className="text-brand-400">Record fingerprint</dt><dd className="font-mono text-brand-700">{entry.entry_hash.slice(0, 16)}…</dd></div>
          </dl>
        </div>
      )}
    </li>
  );
}
