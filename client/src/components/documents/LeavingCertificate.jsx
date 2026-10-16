import { format } from "date-fns";

const REASONS = { completed: "Completed Grade 9", transferred: "Transferred to another school", withdrawn: "Withdrawn by parent" };

function day(value) {
  return value ? format(new Date(value), "d MMMM yyyy") : "-";
}

export default function LeavingCertificate({ doc, remarks }) {
  const { student, school, year } = doc;
  const rows = [
    ["Full name", student.full_name],
    ["Admission number", student.admission_number],
    ["UPI number", student.upi || "-"],
    ["KNEC assessment number", student.assessment_number || "-"],
    ["Date of birth", day(student.date_of_birth)],
    ["Gender", student.gender || "-"],
    ["Date of admission", day(student.admission_date)],
    ["Date of leaving", day(student.left_on)],
    ["Last class attended", student.classroom_name || "-"],
    ["Reason for leaving", student.leaving_reason || REASONS[student.status] || "-"],
  ];

  return (
    <div className="mx-auto aspect-[210/297] w-full max-w-[190mm] bg-white p-[12mm] shadow-md print:shadow-none">
      <div className="flex items-center gap-4 border-b-4 border-double border-brand-700 pb-4">
        <img src="/logo.png" alt="" className="h-[22mm] w-[22mm] object-contain" />
        <div className="flex-1">
          <p className="font-headline text-3xl font-extrabold uppercase text-brand-800">{school.name}</p>
          <p className="text-sm text-brand-600">{school.address} · Tel {school.phone}</p>
          <p className="text-xs italic text-gold-600">{school.motto}</p>
        </div>
      </div>
      <div className="mt-6 flex items-baseline justify-between">
        <p className="font-headline text-3xl font-extrabold uppercase tracking-wide text-brand-800">School Leaving Certificate</p>
        <p className="whitespace-nowrap font-mono text-xs text-brand-500">No. SAK/LC/{student.left_on ? student.left_on.slice(0, 4) : year}/{String(student.id).padStart(4, "0")}</p>
      </div>
      <p className="mt-4 text-sm text-brand-700">This is to certify that the learner named below was a pupil at this school. The details are taken from the school admission register.</p>
      <table className="mt-5 w-full text-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-brand-100">
              <td className="w-[62mm] py-2 text-brand-500">{label}</td>
              <td className="py-2 font-semibold text-brand-900">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-6">
        <p className="text-sm text-brand-500">Head Teacher&apos;s remarks on conduct and ability</p>
        <p className="mt-2 min-h-[24mm] whitespace-pre-line border-b border-dotted border-brand-300 text-sm leading-7 text-brand-900">{remarks}</p>
      </div>
      <div className="mt-14 flex items-end justify-between text-sm text-brand-600">
        <div className="w-[60mm] border-t border-brand-400 pt-1">Head Teacher&apos;s signature</div>
        <div className="flex h-[28mm] w-[40mm] items-center justify-center rounded-full border-2 border-dashed border-brand-200 text-xs text-brand-300">School stamp</div>
        <div className="w-[45mm] border-t border-brand-400 pt-1">Date: {format(new Date(), "d MMM yyyy")}</div>
      </div>
    </div>
  );
}
