import { RotateCcw, Sparkles } from "lucide-react";
import { ChatInput, ChatThread, useAssistant } from "../../components/AssistantChat";
import Loader from "../../components/Loader";

export default function Assistant() {
  const chat = useAssistant();
  const { user, status, messages, reset } = chat;

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
          <button type="button" onClick={reset} className="btn-ghost shrink-0 px-3" aria-label="Start a new chat">
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
          <ChatThread chat={chat} />
          <div className="sticky bottom-0 -mx-4 border-t border-brand-100 bg-cream/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:mx-0 md:rounded-2xl md:border md:px-3">
            <ChatInput chat={chat} id="assistant-question" />
          </div>
        </>
      )}
    </div>
  );
}
