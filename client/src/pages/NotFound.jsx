import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <img src="/logo.png" alt="Success Academy logo" className="h-24 w-24 object-contain opacity-80 mix-blend-multiply" />
      <h1 className="mt-6 font-mono text-5xl font-semibold text-brand-700">404</h1>
      <p className="mt-2 text-brand-500">We could not find that page.</p>
      <Link to="/" className="btn-primary mt-6">
        Back to home
      </Link>
    </div>
  );
}
