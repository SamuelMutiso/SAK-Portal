import { Download, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "install_prompt_hidden_until";

function hiddenNow() {
  try {
    return Number(localStorage.getItem(KEY) || 0) > Date.now();
  } catch {
    return false;
  }
}

function hideFor(days) {
  try {
    localStorage.setItem(KEY, String(Date.now() + days * 24 * 60 * 60 * 1000));
  } catch {
    return;
  }
}

function installed() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isIphone() {
  const agent = window.navigator.userAgent;
  return /iPhone|iPad|iPod/.test(agent) || (agent.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(() => installed() || hiddenNow());
  const [steps, setSteps] = useState(false);

  useEffect(() => {
    if (installed()) return undefined;
    const capture = (event) => {
      event.preventDefault();
      setPrompt(event);
    };
    const done = () => {
      setPrompt(null);
      setHidden(true);
    };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", done);
    if (isIphone() && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent)) setIos(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", done);
    };
  }, []);

  if (hidden || (!prompt && !ios)) return null;

  const dismiss = () => {
    hideFor(14);
    setHidden(true);
  };

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const choice = await prompt.userChoice;
    setPrompt(null);
    if (choice.outcome !== "accepted") hideFor(7);
    setHidden(true);
  };

  return (
    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm print:hidden" role="region" aria-label="Install the app">
      <img src="/icons/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl ring-1 ring-brand-100" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-brand-800">Get the Success Academy app</p>
        {ios ? (
          steps ? (
            <ol className="mt-1 space-y-1 text-sm text-brand-600">
              <li>1. Tap <Share size={16} className="mx-0.5 inline-block align-[-3px] text-sky-600" aria-label="Share" /> at the bottom of Safari</li>
              <li>2. Choose <SquarePlus size={16} className="mx-0.5 inline-block align-[-3px]" aria-hidden="true" /> <span className="font-semibold">Add to Home Screen</span></li>
              <li>3. Tap <span className="font-semibold">Add</span></li>
            </ol>
          ) : (
            <p className="mt-0.5 text-sm text-brand-500">Open the portal from your home screen in one tap, like any other app.</p>
          )
        ) : (
          <p className="mt-0.5 text-sm text-brand-500">Open the portal from your home screen in one tap. It loads faster and takes almost no space.</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {prompt && <button type="button" onClick={install} className="btn-primary px-4 py-2"><Download size={16} /> Install app</button>}
          {ios && !steps && <button type="button" onClick={() => setSteps(true)} className="btn-primary px-4 py-2">Show me how</button>}
          <button type="button" onClick={dismiss} className="btn-ghost px-4 py-2">Not now</button>
        </div>
      </div>
      <button type="button" onClick={dismiss} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-brand-300 hover:bg-brand-50" aria-label="Close">
        <X size={18} />
      </button>
    </div>
  );
}
