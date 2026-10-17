import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ExternalLink, FileText, Link2, NotebookPen, PlayCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import api from "../api/client";

const KIND = {
  notes: { icon: NotebookPen, label: "Notes", tone: "bg-brand-100 text-brand-700" },
  file: { icon: FileText, label: "File", tone: "bg-gold-100 text-gold-600" },
  link: { icon: Link2, label: "Link", tone: "bg-emerald-100 text-emerald-700" },
  video: { icon: PlayCircle, label: "Video", tone: "bg-violet-100 text-violet-700" },
};

function size(bytes) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function MaterialCard({ material, onDelete }) {
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [failed, setFailed] = useState(false);
  const kind = KIND[material.kind] || KIND.notes;
  const Icon = kind.icon;

  const openFile = async () => {
    const tab = window.open("", "_blank");
    setOpening(true);
    setFailed(false);
    try {
      const { data } = await api.get(`/learning/materials/${material.id}/file`, { responseType: "blob" });
      const url = URL.createObjectURL(data);
      if (tab) tab.location.href = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      if (tab) tab.close();
      setFailed(true);
    } finally {
      setOpening(false);
    }
  };

  return (
    <article className="card space-y-3">
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${kind.tone}`}><Icon size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">{material.subject}{material.topic ? ` · ${material.topic}` : ""}</p>
          <h3 className="mt-0.5 font-semibold leading-snug text-brand-800">{material.title}</h3>
          <p className="mt-1 text-xs text-brand-400">
            {material.teacher_name ? `${material.teacher_name} · ` : ""}{formatDistanceToNow(new Date(`${material.created_at}${material.created_at.endsWith("Z") ? "" : "Z"}`), { addSuffix: true })}
            {material.classroom_name ? ` · ${material.classroom_name}` : ""}
          </p>
        </div>
        {onDelete && (
          <button type="button" onClick={() => onDelete(material)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-brand-300 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${material.title}`}>
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {material.body && material.kind === "notes" && (
        <div>
          <div className={`whitespace-pre-line break-words text-[15px] leading-relaxed text-brand-800 ${open ? "" : "line-clamp-3"}`}>{material.body}</div>
          {material.body.length > 160 && (
            <button type="button" onClick={() => setOpen(!open)} className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
              {open ? "Show less" : "Read all"} <ChevronDown size={16} className={open ? "rotate-180" : ""} />
            </button>
          )}
        </div>
      )}
      {material.body && material.kind !== "notes" && <p className="whitespace-pre-line break-words text-sm text-brand-600">{material.body}</p>}

      {material.kind === "file" && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={openFile} disabled={opening} className="btn-gold">
            <FileText size={16} /> {opening ? "Opening…" : "Open file"}
          </button>
          <span className="truncate text-xs text-brand-400">{material.file_name}{material.file_size ? ` · ${size(material.file_size)}` : ""}</span>
          {failed && <p className="w-full text-sm text-red-600">The file could not be opened. Please try again.</p>}
        </div>
      )}
      {(material.kind === "link" || material.kind === "video") && material.link_url && (
        <a href={material.link_url} target="_blank" rel="noopener noreferrer" className="btn-ghost max-w-full">
          <ExternalLink size={16} className="shrink-0" /> <span className="truncate">{material.kind === "video" ? "Watch video" : "Open link"}</span>
        </a>
      )}
    </article>
  );
}
