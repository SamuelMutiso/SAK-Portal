import { Bot, Maximize2, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";
import { ASSISTANT_ROLES, ChatInput, ChatThread, useAssistant } from "./AssistantChat";

function Bubble() {
  const chat = useAssistant();
  const { user, status, messages, reset } = chat;
  const [open, setOpen] = useState(false);
  const base = user.role === "bursar" ? "/bursar" : `/${user.role}`;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    const phone = !window.matchMedia("(min-width: 640px)").matches;
    if (phone) document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!status?.enabled) return null;

  return (
    <div className="print:hidden">
      {open && (
        <section
          role="dialog"
          aria-label="School assistant"
          className="fixed inset-0 z-50 flex h-[100dvh] flex-col bg-cream sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[min(620px,calc(100dvh-8rem))] sm:w-[400px] sm:overflow-hidden sm:rounded-3xl sm:border sm:border-brand-100 sm:shadow-2xl"
        >
          <header className="flex items-center gap-3 bg-brand-900 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-500 text-brand-900"><Bot size={22} /></span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="font-semibold">School assistant</p>
              <p className="truncate text-xs text-brand-200">Reads the school records</p>
            </div>
            {messages.length > 0 && (
              <button type="button" onClick={reset} className="grid h-10 w-10 place-items-center rounded-full hover:bg-brand-800" aria-label="Start a new chat">
                <RotateCcw size={18} />
              </button>
            )}
            <Link to={`${base}/assistant`} onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-brand-800" aria-label="Open full page">
              <Maximize2 size={18} />
            </Link>
            <button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-brand-800" aria-label="Close assistant">
              <X size={20} />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
            {messages.length === 0 && (
              <div className="flex justify-start">
                <p className="max-w-[92%] rounded-2xl rounded-bl-md border border-brand-100 bg-white px-4 py-3 text-[15px] text-brand-900 shadow-sm">
                  Hi {user.full_name.split(" ")[0]} 👋 How can I help? Ask me about {user.role === "bursar" ? "fees, payments or balances" : "attendance, fees, results or what's coming up"}.
                </p>
              </div>
            )}
            <ChatThread chat={chat} compact />
          </div>

          <div className="border-t border-brand-100 bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            <ChatInput chat={chat} id="bubble-question" autoFocus />
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close assistant" : "Ask the AI assistant"}
        aria-expanded={open}
        className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-20 items-center gap-2 rounded-full bg-brand-800 py-2 pl-2 pr-2 text-white shadow-xl ring-4 ring-white/70 transition hover:bg-brand-700 sm:right-6 sm:pr-4 ${open ? "hidden sm:flex" : "flex"}`}
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-gold-500 text-brand-900">{open ? <X size={20} /> : <Bot size={22} />}</span>
        <span className="hidden text-sm font-semibold sm:inline">{open ? "Close" : "Ask AI assistant"}</span>
      </button>
    </div>
  );
}

export default function AssistantBubble() {
  const user = useSelector((state) => state.auth.user);
  const { pathname } = useLocation();
  if (!ASSISTANT_ROLES.includes(user?.role) || pathname.endsWith("/assistant")) return null;
  return <Bubble />;
}
