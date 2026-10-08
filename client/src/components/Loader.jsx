export default function Loader({ label = "Loading..." }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-brand-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}
