import { format, isToday, isYesterday } from "date-fns";
import { ArrowLeft, MessageSquareText, Search, Send, Smartphone } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import api, { errorMessage } from "../../api/client";
import Loader from "../../components/Loader";

const STATUS = {
  sent: { label: "Sent", tone: "bg-emerald-100 text-emerald-700" },
  preview: { label: "Not sent, preview only", tone: "bg-brand-100 text-brand-600" },
  failed: { label: "Failed", tone: "bg-red-100 text-red-700" },
  skipped: { label: "Not sent, daily limit reached", tone: "bg-amber-100 text-amber-800" },
};

const FILTERS = [["", "All"], ["sent", "Sent"], ["preview", "Preview"], ["failed", "Failed"]];

const when = (value) => {
  const date = new Date(`${value}Z`);
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return `Yesterday ${format(date, "h:mm a")}`;
  return format(date, "d MMM, h:mm a");
};

const local = (phone) => (phone.startsWith("+254") ? `0${phone.slice(4, 7)} ${phone.slice(7, 10)} ${phone.slice(10)}` : phone);

function GatewayBanner({ status }) {
  if (status.provider === "textbee") {
    const count = status.live_phones.length;
    const reach = status.everyone ? "Every parent gets a real text." : count ? `Real texts go only to the ${count === 1 ? "number" : `${count} numbers`} below. Everyone else's messages are saved here as a preview.` : "No numbers are set to get real texts yet, so every message is saved here as a preview.";
    return (
      <div className="card flex flex-wrap items-start gap-4 border-emerald-200 bg-emerald-50/60">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white"><Smartphone size={22} /></span>
        <div className="min-w-[12rem] flex-1">
          <p className="font-semibold text-brand-900">Real SMS go out from the school&apos;s Android phone</p>
          <p className="mt-0.5 text-sm text-brand-600">{reach}</p>
          {!status.everyone && status.live_phones.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {status.live_phones.map((phone) => <span key={phone} className="rounded-full bg-white px-2.5 py-0.5 font-mono text-xs text-brand-700 ring-1 ring-emerald-200">{local(phone)}</span>)}
            </div>
          )}
        </div>
        <div className="sm:text-right">
          <p className="font-mono text-2xl font-semibold text-brand-900">{status.sent_today}<span className="text-base text-brand-400">/{status.daily_limit}</span></p>
          <p className="text-xs text-brand-500">sent in the last 24 hours</p>
        </div>
      </div>
    );
  }
  if (status.provider === "africastalking") {
    return <div className="card border-emerald-200 bg-emerald-50/60 text-sm text-brand-700"><p className="font-semibold text-brand-900">Real SMS go out through Africa&apos;s Talking</p><p>Every parent gets a real text.</p></div>;
  }
  return (
    <div className="card flex items-start gap-4 border-gold-400/40 bg-gold-100/40">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold-500 text-brand-900"><MessageSquareText size={22} /></span>
      <div>
        <p className="font-semibold text-brand-900">Preview only</p>
        <p className="mt-0.5 text-sm text-brand-600">Every SMS the portal would send is saved here, but none reach a phone. Connect an SMS phone to send real texts.</p>
      </div>
    </div>
  );
}

function TestSend({ onSent }) {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  async function send(event) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const { data } = await api.post("/sms/test", { phone });
      const text = {
        sent: "Test SMS sent. It should arrive in a few seconds.",
        preview: "Saved as a preview. This number is not set to get real SMS.",
        skipped: "Not sent. Today's SMS limit has been reached.",
        failed: data.error || "The SMS could not be sent.",
      }[data.status];
      setNotice({ type: data.status === "sent" ? "success" : data.status === "failed" ? "error" : "info", text });
      onSent();
    } catch (err) {
      setNotice({ type: "error", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={send} className="card space-y-3">
      <div>
        <p className="font-semibold text-brand-800">Send a test SMS</p>
        <p className="text-sm text-brand-500">Check the SMS phone is working before a demo.</p>
      </div>
      <div className="flex gap-2">
        <label htmlFor="test-phone" className="sr-only">Phone number</label>
        <input id="test-phone" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder="0712 345 678" className="input" required />
        <button type="submit" disabled={busy || phone.trim().length < 9} className="btn-primary shrink-0 px-4"><Send size={16} /> {busy ? "Sending…" : "Send test"}</button>
      </div>
      {notice && <p role="status" className={`rounded-xl px-3 py-2 text-sm ${notice.type === "error" ? "bg-red-50 text-red-700" : notice.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-brand-50 text-brand-700"}`}>{notice.text}</p>}
    </form>
  );
}

function Thread({ thread, onBack }) {
  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="overflow-hidden rounded-[2.25rem] border-[6px] border-brand-900 bg-white shadow-xl">
        <div className="flex items-center gap-3 border-b border-brand-100 bg-brand-50/70 px-4 py-3">
          <button type="button" onClick={onBack} className="rounded-full p-1 text-brand-500 hover:bg-white lg:hidden" aria-label="Back to all numbers"><ArrowLeft size={18} /></button>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-800 font-semibold text-white">{(thread.name || "?").slice(0, 1)}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-brand-900">{thread.name || local(thread.phone)}</p>
            <p className="font-mono text-[11px] text-brand-400">{local(thread.phone)}</p>
          </div>
        </div>
        <div className="max-h-[32rem] space-y-3 overflow-y-auto bg-[linear-gradient(#fff,#F2F6FB)] p-4">
          {[...thread.messages].reverse().map((item) => (
            <div key={item.id} className="flex flex-col items-start">
              <p className="mb-1 text-[11px] text-brand-400">{when(item.created_at)}</p>
              <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-tl-md bg-brand-100/70 px-3.5 py-2.5 text-[14px] leading-snug text-brand-900">{item.message}</div>
              <span className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS[item.status]?.tone}`}>{STATUS[item.status]?.label}{item.status === "failed" && item.error ? `: ${item.error}` : ""}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SmsOutbox() {
  const role = useSelector((state) => state.auth.user.role);
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    api.get("/sms", { params: { status: filter || undefined, q: search || undefined } }).then(({ data: result }) => setData(result));
  }, [filter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const threads = useMemo(() => {
    const groups = new Map();
    (data?.messages || []).forEach((item) => {
      if (!groups.has(item.phone)) groups.set(item.phone, { phone: item.phone, name: item.name, messages: [] });
      groups.get(item.phone).messages.push(item);
    });
    return [...groups.values()];
  }, [data]);

  if (!data) return <Loader />;

  const open = threads.find((thread) => thread.phone === selected) || null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">SMS outbox</h1>
        <p className="text-brand-500">Every text the portal sends to parents and staff: fee reminders, bus updates, receipts, notices and calendar reminders.</p>
      </div>

      <div className={`grid grid-cols-1 gap-4 ${role === "admin" ? "lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]" : ""}`}>
        <GatewayBanner status={data.status} />
        {role === "admin" && <TestSend onSent={load} />}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-2xl bg-brand-100/60 p-1">
          {FILTERS.map(([key, label]) => (
            <button key={key || "all"} type="button" onClick={() => setFilter(key)} className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${filter === key ? "bg-white text-brand-800 shadow-sm" : "text-brand-500"}`}>{label}</button>
          ))}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); setSearch(query.trim()); }} className="relative ml-auto w-full sm:w-72">
          <label htmlFor="sms-search" className="sr-only">Search by number or words</label>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
          <input id="sms-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search number or words" className="input pl-9" />
        </form>
      </div>

      {threads.length === 0 ? (
        <div className="card text-center text-sm text-brand-500">
          <MessageSquareText className="mx-auto mb-2 text-brand-300" size={28} />
          {search || filter ? "No messages match. Clear the search or pick All." : "No SMS yet. Send a fee reminder, a notice or a test SMS and it shows up here."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <ul className={`card min-w-0 divide-y divide-brand-50 p-0 ${open ? "hidden lg:block" : ""}`}>
            {threads.map((thread) => {
              const latest = thread.messages[0];
              return (
                <li key={thread.phone}>
                  <button type="button" onClick={() => setSelected(thread.phone)} className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-brand-50/60 ${selected === thread.phone ? "bg-brand-50" : ""}`}>
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-800 font-semibold text-white">{(thread.name || "?").slice(0, 1)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-semibold text-brand-900">{thread.name || local(thread.phone)}</span>
                        <span className="shrink-0 text-xs text-brand-400">{when(latest.created_at)}</span>
                      </span>
                      <span className="block truncate text-sm text-brand-600">{latest.message}</span>
                      <span className="mt-1 flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS[latest.status]?.tone}`}>{STATUS[latest.status]?.label}</span>
                        {thread.messages.length > 1 && <span className="text-xs text-brand-400">{thread.messages.length} messages</span>}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className={`lg:sticky lg:top-20 lg:self-start ${open ? "" : "hidden lg:block"}`}>
            {open ? <Thread thread={open} onBack={() => setSelected(null)} /> : <p className="card text-center text-sm text-brand-500">Pick a number to see its messages as they look on the phone.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
