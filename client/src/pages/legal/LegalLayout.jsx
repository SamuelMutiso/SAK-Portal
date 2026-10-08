import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function LegalLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-brand-100">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <img src="/logo.png" alt="Success Academy crest" className="h-10 w-10 object-contain mix-blend-multiply" />
          <p className="font-headline text-lg font-bold uppercase text-brand-800">Success Academy</p>
          <Link to="/" className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"><ArrowLeft size={15} /> Home</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-headline text-5xl font-extrabold uppercase leading-none text-brand-800">{title}</h1>
        <p className="mt-2 text-sm text-brand-400">Version 2026-10 · Last updated 8 October 2026</p>
        <div className="legal mt-8 space-y-6 leading-relaxed text-brand-700">{children}</div>
      </main>
    </div>
  );
}
