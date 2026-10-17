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
    <div className="mx-auto w-full max-w-[190mm] [container-type:inline-size] print:max-w-[178mm]">
      <div className="aspect-[210/297] w-full bg-white p-[6.3cqw] shadow-md print:shadow-none">
        <div className="flex items-center gap-[2.2cqw] border-b-[max(3px,0.6cqw)] border-double border-brand-700 pb-[2.2cqw]">
          <img src="/logo.png" alt="" className="h-[11.5cqw] w-[11.5cqw] object-contain" />
          <div className="min-w-0 flex-1">
            <p className="font-headline text-[4.2cqw] font-extrabold uppercase leading-tight text-brand-800">{school.name}</p>
            <p className="text-[1.95cqw] leading-tight text-brand-600">{school.address} · Tel {school.phone}</p>
            <p className="text-[1.7cqw] italic leading-tight text-gold-600">{school.motto}</p>
          </div>
        </div>
        <div className="mt-[3.3cqw] flex items-baseline justify-between gap-[2cqw]">
          <p className="font-headline text-[4.2cqw] font-extrabold uppercase leading-tight tracking-wide text-brand-800">School Leaving Certificate</p>
          <p className="whitespace-nowrap font-mono text-[1.6cqw] text-brand-500">No. SAK/LC/{student.left_on ? student.left_on.slice(0, 4) : year}/{String(student.id).padStart(4, "0")}</p>
        </div>
        <p className="mt-[2.2cqw] text-[1.95cqw] leading-snug text-brand-700">This is to certify that the learner named below was a pupil at this school. The details are taken from the school admission register.</p>
        <table className="mt-[2.8cqw] w-full text-[1.95cqw]">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="border-b border-brand-100">
                <td className="w-[32cqw] py-[1.1cqw] align-top text-brand-500">{label}</td>
                <td className="py-[1.1cqw] font-semibold text-brand-900">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-[3.3cqw]">
          <p className="text-[1.95cqw] text-brand-500">Head Teacher&apos;s remarks on conduct and ability</p>
          <p className="mt-[1.1cqw] min-h-[12.5cqw] whitespace-pre-line border-b border-dotted border-brand-300 text-[1.95cqw] leading-relaxed text-brand-900">{remarks}</p>
        </div>
        <div className="mt-[7.8cqw] flex items-end justify-between text-[1.95cqw] text-brand-600">
          <div className="w-[31cqw] border-t border-brand-400 pt-[0.6cqw]">Head Teacher&apos;s signature</div>
          <div className="flex h-[14.6cqw] w-[21cqw] items-center justify-center rounded-full border-2 border-dashed border-brand-200 text-[1.6cqw] text-brand-300">School stamp</div>
          <div className="w-[23.5cqw] border-t border-brand-400 pt-[0.6cqw]">Date: {format(new Date(), "d MMM yyyy")}</div>
        </div>
      </div>
    </div>
  );
}
