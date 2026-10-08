import { CheckCircle2, X } from "lucide-react";

export default function SmsPreview({ sms, onClose }) {
  return (
    <div className="card border-gold-400 bg-gold-100/40">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={22} />
        <div className="flex-1">
          <p className="font-semibold text-brand-800">
            SMS sent to {sms.sent} parent{sms.sent === 1 ? "" : "s"}
          </p>
          <p className="text-xs text-brand-500">
            {sms.mode === "preview" ? "Demo mode: no real messages were sent" : "Delivered through Africa's Talking"}
          </p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 hover:bg-white" aria-label="Close preview">
          <X size={18} />
        </button>
      </div>

      {sms.message && (
        <div className="mx-auto mt-4 max-w-xs rounded-[2rem] border-4 border-brand-800 bg-white p-4 shadow-lg">
          <p className="text-center text-xs font-semibold text-brand-400">SUCCESSACAD</p>
          <div className="mt-3 rounded-2xl rounded-tl-sm bg-brand-50 p-3 text-sm text-brand-800">{sms.message}</div>
          <p className="mt-2 text-right font-mono text-[10px] text-brand-300">{sms.recipients.slice(0, 3).join(", ")}{sms.recipients.length > 3 ? " ..." : ""}</p>
        </div>
      )}
    </div>
  );
}
