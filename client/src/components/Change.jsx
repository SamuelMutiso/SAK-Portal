import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { changeText } from "../insights";

export default function Change({ value }) {
  if (value === null || value === undefined || value === 0) return <span className="font-mono text-xs text-brand-300">-</span>;
  const up = value > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 font-mono text-xs font-semibold ${up ? "text-emerald-600" : "text-red-600"}`}>
      <Icon size={13} />{changeText(value)}
    </span>
  );
}
