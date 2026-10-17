import { ArrowUp, ShieldCheck } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import api, { errorMessage } from "../api/client";

export const ASSISTANT_ROLES = ["director", "admin", "bursar"];

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
let statusRequest = { userId: null, promise: null };

function loadStatus(userId) {
  if (statusRequest.userId !== userId) {
    const promise = api.get("/assistant").then(({ data }) => data).catch(() => {
      statusRequest = { userId: null, promise: null };
      return { enabled: false, suggestions: [] };
    });
    statusRequest = { userId, promise };
  }
  return statusRequest.promise;
}

export function useAssistant() {
  const user = useSelector((state) => state.auth.user);
  const [status, setStatus] = useState(null);
  const [messages, setMessages] = useState(saved.userId === user.id ? saved.messages : []);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    loadStatus(user.id).then((data) => live && setStatus(data));
    return () => {
      live = false;
    };
  }, [user.id]);

  useEffect(() => {
    saved = { userId: user.id, messages };
  }, [messages, user.id]);

  const send = async (text) => {
    const asked = text.trim();
    if (asked.length < 2 || busy) return;
    const history = messages.filter((item) => !item.failed).map(({ role, content }) => ({ role, content })).slice(-10);
    setMessages((items) => [...items, { role: "user", content: asked }]);
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

  return { user, status, messages, busy, send, reset: () => setMessages([]) };
}

function Inline({ text }) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={index}>{part.slice(1, -1)}</em>;
    return <Fragment key={index}>{part}</Fragment>;
  });
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

export function ChatThread({ chat, compact = false }) {
  const end = useRef(null);
  const { messages, busy, status, send } = chat;

  useEffect(() => {
    if (messages.length) end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  return (
    <div className="space-y-3" aria-live="polite">
      {messages.length === 0 && (
        <div className={compact ? "space-y-3" : "card space-y-3"}>
          <p className="text-sm font-semibold text-brand-800">Try one of these</p>
          <div className="flex flex-wrap gap-2">
            {(compact ? status.suggestions.slice(0, 4) : status.suggestions).map((item) => (
              <button key={item} type="button" onClick={() => send(item)} className="rounded-full border border-brand-200 bg-brand-50 px-3 py-2 text-left text-sm font-medium text-brand-700 transition hover:border-brand-400 hover:bg-white">
                {item}
              </button>
            ))}
          </div>
        </div>
      )}
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
  );
}

export function ChatInput({ chat, id, autoFocus = false }) {
  const [question, setQuestion] = useState("");
  const box = useRef(null);

  useEffect(() => {
    if (autoFocus && window.matchMedia("(min-width: 768px)").matches) box.current?.focus();
  }, [autoFocus]);

  const ask = () => {
    if (chat.busy || question.trim().length < 2) return;
    chat.send(question);
    setQuestion("");
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && window.matchMedia("(min-width: 768px)").matches) {
      event.preventDefault();
      ask();
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        ask();
      }}
    >
      <div className="flex items-end gap-2">
        <label htmlFor={id} className="sr-only">Your question</label>
        <textarea
          ref={box}
          id={id}
          rows={1}
          maxLength={500}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask a question…"
          className="input max-h-32 min-h-[44px] resize-none"
        />
        <button type="submit" disabled={chat.busy || question.trim().length < 2} className="btn-primary h-11 w-11 shrink-0 p-0" aria-label="Send question">
          <ArrowUp size={20} />
        </button>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-brand-400">
        <ShieldCheck size={14} className="shrink-0" /> Names are swapped for codes before anything goes to the AI. It can read records but cannot change anything.
      </p>
    </form>
  );
}
