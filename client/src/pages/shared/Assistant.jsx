import { ArrowUp, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import api, { errorMessage } from "../../api/client";
import Loader from "../../components/Loader";

const REPORT_NAMES = {
  school_overview: "School overview",
  attendance_report: "Attendance",
  fees_report: "Fees",
  payments_report: "Payments",
  performance_report: "Exam results",
  learner_lookup: "Learner record",
  notices_and_events: "Notices & calendar",
};

let saved = { userId: null, messages: [] };

function Inline({ text }) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : <Fragment key={index}>{part}</Fragment>
  );
}

function Answer({ text }) {
  const blocks = [];
  text.split("\n").forEach((raw) => {
    const line = raw.trim();
    if (!line || /^\|?\s*-{3,}/.test(line)) return;
    const bullet = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)/);
    const heading = line.match(/^#{1,4}\s+(.*)/);
    if (bullet) {
      const last = blocks[blocks.length - 1];
      if (last?.type === "list") last.items.push(bullet[1]);
      else blocks.push({ type: "list", items: [bullet[1]] });
    } else if (heading) {
      blocks.push({ type: "heading", text: heading[1] });
    } else {
      blocks.push({ type: "text", text: line.replace(/^\||\|$/g, "").replace(/\s*\|\s*/g, " · ") });
    }
  });
  return (
    <div className="space-y-2">
      {blocks.map((block, index) =>
        block.type === "list" ? (
          <ul key={index} className="list-disc space-y-1 pl-5">
            {block.items.map((item, position) => <li key={position}><Inline text={item} /></li>)}
          </ul>
        ) : block.type === "heading" ? (
          <p key={index} className="font-semibold text-brand-800"><Inline text={block.text} /></p>
        ) : (
          <p key={index}><Inline text={block.text} /></p>
        )
      )}
    </div>
  );
}

export default function Assistant() {
  const user = useSelector((state) => state.auth.user);
  const [status, setStatus] = useState(null);
  const [messages, setMessages] = useState(saved.userId === user.id ? saved.messages : []);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef(null);

  useEffect(() => {
    api.get("/assistant").then(({ data }) => setStatus(data)).catch(() => setStatus({ enabled: false, suggestions: [] }));
  }, []);

  useEffect(() => {
    saved = { userId: user.id, messages };
    if (messages.length) end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy, user.id]);

  const send = async (text) => {
    const asked = text.trim();
    if (!asked || busy) return;
    const history = messages.filter((item) => !item.failed).map(({ role, content }) => ({ role, content })).slice(-10);
    setMessages((items) => [...items, { role: "user", content: asked }]);
    setQuestion("");
    setBusy(true);
    try {
      const { data } = await api.post("/assistant/ask", { question: asked, history });
      setMessages((items) => [...items, { role: "assistant", content: data.answer, reports: data.reports }]);
    } catch (error) {
      setMessages((items) => [...items, { role: "assistant", content: errorMessage(error), failed: true }]);
    } finally {
      setBusy(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    send(question);
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && window.matchMedia("(min-width: 768px)").matches) {
      event.preventDefault();
      send(question);
    }
  };

  if (!status) return <Loader />;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold-500 text-brand-900"><Sparkles size={22} /></span>
        <div className="min-w-0 flex-1">
          <h1 className="page-title">Ask the assistant</h1>
          <p className="mt-1 text-sm text-brand-500">{user.role === "bursar" ? "Ask about fees, payments, balances or the calendar in plain words." : "Ask about attendance, fees, payments, results or the calendar in plain words."}</p>
        </div>
        {messages.length > 0 && (
          <button type="button" onClick={() => setMessages([])} className="btn-ghost shrink-0 px-3" aria-label="Start a new chat">
            <RotateCcw size={16} /> <span className="hidden sm:inline">New chat</span>
          </button>
        )}
      </div>

      {!status.enabled ? (
        <div className="card text-sm text-brand-700">
          <p className="font-semibold text-brand-800">The assistant has not been switched on yet.</p>
          <p className="mt-1">It needs an AI key to be added on the server. Everything else in the portal works as normal.</p>
        </div>
      ) : (
        <>
          {messages.length === 0 && (
            <div className="card space-y-3">
              <p className="text-sm font-semibold text-brand-800">Try one of these</p>
              <div className="flex flex-wrap gap-2">
                {status.suggestions.map((item) => (
                  <button key={item} type="button" onClick={() => send(item)} className="rounded-full border border-brand-200 bg-brand-50 px-3 py-2 text-left text-sm font-medium text-brand-700 transition hover:border-brand-400 hover:bg-white">
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3" aria-live="polite">
            {messages.map((item, index) =>
              item.role === "user" ? (
                <div key={index} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-brand-700 px-4 py-2.5 text-[15px] text-white">{item.content}</p>
                </div>
              ) : (
                <div key={index} className="flex justify-start">
                  <div className={`max-w-[92%] break-words rounded-2xl rounded-bl-md border px-4 py-3 text-[15px] leading-relaxed ${item.failed ? "border-red-200 bg-red-50 text-red-700" : "border-brand-100 bg-white text-brand-900 shadow-sm"}`}>
                    <Answer text={item.content} />
                    {item.reports?.length > 0 && (
                      <p className="mt-2 border-t border-brand-50 pt-2 text-xs text-brand-400">From: {item.reports.map((name) => REPORT_NAMES[name] || name).join(", ")}</p>
                    )}
                  </div>
                </div>
              )
            )}
            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-brand-100 bg-white px-4 py-3 text-sm text-brand-500 shadow-sm">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" /> Checking the records…
                </div>
              </div>
            )}
            <div ref={end} />
          </div>

          <form onSubmit={submit} className="sticky bottom-0 -mx-4 border-t border-brand-100 bg-cream/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:mx-0 md:rounded-2xl md:border md:px-3">
            <div className="flex items-end gap-2">
              <label htmlFor="assistant-question" className="sr-only">Your question</label>
              <textarea
                id="assistant-question"
                rows={1}
                maxLength={500}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask a question…"
                className="input max-h-32 min-h-[44px] resize-none"
              />
              <button type="submit" disabled={busy || question.trim().length < 2} className="btn-primary h-11 w-11 shrink-0 p-0" aria-label="Send question">
                <ArrowUp size={20} />
              </button>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-brand-400">
              <ShieldCheck size={14} className="shrink-0" /> Full names are swapped for codes before anything goes to the AI. It can read records but cannot change anything.
            </p>
          </form>
        </>
      )}
    </div>
  );
}
