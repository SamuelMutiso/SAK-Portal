import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Trash2 } from "lucide-react";

const AUDIENCE_STYLES = {
  all: "bg-brand-100 text-brand-700",
  class: "bg-sky-100 text-sky-700",
  club: "bg-emerald-100 text-emerald-700",
  route: "bg-amber-100 text-amber-700",
  boarders: "bg-violet-100 text-violet-700",
};

export default function NoticeCard({ notice, onDelete, showSms = true }) {
  return (
    <article className="card">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`badge ${AUDIENCE_STYLES[notice.audience]}`}>{notice.target_name}</span>
        {showSms && notice.sms_count > 0 && (
          <span className="badge bg-gold-100 text-gold-600">
            <MessageSquare size={12} />
            {notice.sms_count} SMS
          </span>
        )}
        <span className="ml-auto text-xs text-brand-400">
          {formatDistanceToNow(new Date(notice.created_at + "Z"), { addSuffix: true })}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-semibold text-brand-800">{notice.title}</h3>
      <p className="mt-1 text-sm text-brand-600">{notice.body}</p>
      <div className="mt-3 flex items-center text-xs text-brand-400">
        <span>Posted by {notice.author_name}</span>
        {onDelete && (
          <button onClick={() => onDelete(notice.id)} className="ml-auto rounded-lg p-1.5 hover:bg-red-50 hover:text-red-600" aria-label="Delete notice">
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </article>
  );
}
