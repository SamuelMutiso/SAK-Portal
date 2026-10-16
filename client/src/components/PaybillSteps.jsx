import { Check, Copy, Hash } from "lucide-react";
import { useState } from "react";

function CopyValue({ label, value }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex min-w-0 items-center justify-between gap-1 rounded-xl bg-white px-3 py-2 ring-1 ring-emerald-100">
      <div>
        <p className="text-xs text-brand-400">{label}</p>
        <p className="whitespace-nowrap font-mono text-base font-semibold text-brand-800 sm:text-lg">{value}</p>
      </div>
      <button type="button" onClick={copy} className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50" aria-label={`Copy ${label}`}>
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
    </div>
  );
}

export default function PaybillSteps({ paybill, account }) {
  const number = paybill || "123456";
  const steps = [
    "Open M-Pesa on your phone",
    "Choose Lipa na M-Pesa, then Pay Bill",
    `Business number: ${number}`,
    `Account number: ${account}`,
    "Enter the amount and your PIN",
  ];

  return (
    <div className="card space-y-3 border-emerald-100 bg-emerald-50/60">
      <h3 className="flex items-center gap-2 font-semibold text-brand-800"><Hash size={18} className="text-emerald-600" /> Pay through the school Paybill</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <CopyValue label="Business number" value={number} />
        <CopyValue label="Account number" value={account} />
      </div>
      <ol className="space-y-1.5 text-sm text-brand-600">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">{index + 1}</span>
            {step}
          </li>
        ))}
      </ol>
      <p className="text-xs text-brand-500">The payment shows here and you get an SMS receipt within a minute. Use the account number exactly as shown so it goes to the right child.</p>
      {!paybill && <p className="text-xs font-semibold text-amber-700">Demo Paybill number. The real school number goes here.</p>}
    </div>
  );
}
