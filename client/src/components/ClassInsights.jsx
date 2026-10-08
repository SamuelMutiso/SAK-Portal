import { AlertTriangle, ArrowDownRight, Lightbulb, TrendingUp, Trophy } from "lucide-react";
import { showValue } from "../insights";
import Change from "./Change";
import GradeBadge from "./GradeBadge";

function Mean({ label, value, grade, scale }) {
  return (
    <div className="rounded-2xl bg-brand-50 px-4 py-3">
      <p className="text-xs font-semibold text-brand-500">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <p className="font-mono text-2xl font-semibold text-brand-800">{showValue(value, scale)}</p>
        <GradeBadge grade={grade} />
      </div>
    </div>
  );
}

function People({ title, icon: Icon, tone, learners, render, empty }) {
  return (
    <div className="card">
      <h3 className={`flex items-center gap-2 font-semibold ${tone}`}><Icon size={17} /> {title}</h3>
      {learners.length === 0 ? (
        <p className="mt-3 text-sm text-brand-400">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {learners.map((learner) => (
            <li key={learner.id} className="rounded-xl bg-brand-50 px-3 py-2 text-sm">{render(learner)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ClassInsights({ data }) {
  const { scale } = data;
  if (data.empty) return <p className="card text-brand-500">{data.headlines[0]}</p>;
  const top = data.subjects[0]?.mean || 1;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-brand-800 p-6 text-white">
        <p className="flex items-center gap-2 text-sm font-semibold text-gold-400"><Lightbulb size={16} /> What the marks say · {data.classroom_name} · {data.label}</p>
        <ul className="mt-3 space-y-1.5 text-brand-50">
          {data.headlines.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Mean label={`${data.label} mean`} value={data.exam_mean} grade={data.exam_grade} scale={scale} />
        <Mean label={`${data.term.replace(" 2026", "")} mean so far`} value={data.term_mean} grade={data.term_grade} scale={scale} />
        <Mean label="Year mean so far" value={data.year_mean} grade={data.year_grade} scale={scale} />
      </div>

      <div className="card">
        <div className="flex items-baseline justify-between">
          <h3 className="font-semibold text-brand-800">Subjects, best to weakest</h3>
          {data.previous_label && <p className="text-xs text-brand-400">Change since {data.previous_label}</p>}
        </div>
        <ul className="mt-4 space-y-2.5">
          {data.subjects.map((subject, index) => (
            <li key={subject.subject} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[12rem_1fr_auto]">
              <p className="truncate text-sm font-semibold text-brand-700">{subject.subject}</p>
              <div className="order-3 col-span-2 h-2.5 overflow-hidden rounded-full bg-brand-50 sm:order-none sm:col-span-1">
                <div
                  className={`h-full rounded-full ${index < 3 ? "bg-emerald-500" : index >= data.subjects.length - 3 ? "bg-amber-500" : "bg-brand-400"}`}
                  style={{ width: `${(subject.mean / top) * 100}%` }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 text-right font-mono text-sm font-semibold">{showValue(subject.mean, scale)}</span>
                <span className="w-12"><Change value={subject.change} /></span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <People
          title="Top of the class"
          icon={Trophy}
          tone="text-brand-700"
          learners={data.top}
          empty="No marks yet."
          render={(learner) => (
            <div className="flex items-center gap-2">
              <span className="w-5 font-mono text-xs text-brand-400">{learner.position}</span>
              <span className="flex-1 font-semibold">{learner.full_name}</span>
              <span className="font-mono font-semibold">{showValue(learner.mean, scale)}</span>
            </div>
          )}
        />
        <People
          title="Most improved"
          icon={TrendingUp}
          tone="text-emerald-700"
          learners={data.most_improved}
          empty={data.previous_label ? "Nobody improved on the last assessment." : "This is the first assessment, so there is nothing to compare yet."}
          render={(learner) => (
            <div className="flex items-center gap-2">
              <span className="flex-1 font-semibold">{learner.full_name}</span>
              <span className="font-mono text-brand-500">{showValue(learner.mean, scale)}</span>
              <Change value={learner.change} />
            </div>
          )}
        />
        <People
          title="Below expectation (BE) in a subject"
          icon={AlertTriangle}
          tone="text-red-700"
          learners={data.failed}
          empty="No learner is below expectation in any subject."
          render={(learner) => (
            <div>
              <p className="font-semibold">{learner.full_name}</p>
              <p className="mt-1 flex flex-wrap gap-1.5">
                {learner.failed_subjects.map((item) => (
                  <span key={item.subject} className="badge bg-red-100 text-red-700">{item.subject} {showValue(item.value, scale)}</span>
                ))}
              </p>
            </div>
          )}
        />
        <People
          title="Dropped since last time"
          icon={ArrowDownRight}
          tone="text-amber-700"
          learners={data.declined}
          empty="Nobody dropped."
          render={(learner) => (
            <div className="flex items-center gap-2">
              <span className="flex-1 font-semibold">{learner.full_name}</span>
              <span className="font-mono text-brand-500">{showValue(learner.mean, scale)}</span>
              <Change value={learner.change} />
            </div>
          )}
        />
      </div>

      <div className="card">
        <h3 className="flex items-center gap-2 font-semibold text-amber-700"><AlertTriangle size={17} /> Needs attention, by subject</h3>
        <p className="mt-1 text-xs text-brand-400">Learners below Meeting Expectations, or who dropped {scale === "marks" ? "10 marks or more" : "a whole level"}, in a subject.</p>
        {data.needs_attention.length === 0 ? (
          <p className="mt-3 text-sm text-brand-400">Every learner is meeting expectations in every subject.</p>
        ) : (
          <ul className="mt-3 divide-y divide-brand-50">
            {data.needs_attention.map((learner) => (
              <li key={learner.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
                <span className="min-w-40 flex-1 font-semibold">{learner.full_name}</span>
                {learner.weak_subjects.map((item) => (
                  <span key={item.subject} className={`badge ${item.value < (scale === "marks" ? 50 : 2.5) ? "bg-amber-100 text-amber-700" : "bg-brand-100 text-brand-700"}`}>
                    {item.subject} {showValue(item.value, scale)}
                    {item.change < 0 && <span className="ml-1 text-red-600">({item.change})</span>}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
