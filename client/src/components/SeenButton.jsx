import { CheckCheck, Eye } from "lucide-react";
import { useState } from "react";
import api from "../api/client";

export default function SeenButton({ itemType, itemId, seen, onSeen }) {
  const [saving, setSaving] = useState(false);

  async function markSeen() {
    setSaving(true);
    await api.post("/acknowledgements", { item_type: itemType, item_id: itemId });
    setSaving(false);
    onSeen?.(`${itemType}:${itemId}`);
  }

  if (seen) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
        <CheckCheck size={14} /> Seen
      </span>
    );
  }

  return (
    <button onClick={markSeen} disabled={saving} className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100">
      <Eye size={14} /> {saving ? "Saving..." : "Mark as seen"}
    </button>
  );
}
