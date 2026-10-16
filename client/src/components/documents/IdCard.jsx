import { format } from "date-fns";
import LearnerAvatar from "../LearnerAvatar";

function Row({ label, value }) {
  return (
    <div className="flex gap-1 leading-tight">
      <span className="w-[16mm] shrink-0 text-[6.5pt] uppercase tracking-wide text-brand-400">{label}</span>
      <span className="text-[7.5pt] font-semibold text-brand-900">{value}</span>
    </div>
  );
}

export default function IdCard({ doc }) {
  const { student, school, year } = doc;
  const born = student.date_of_birth ? format(new Date(student.date_of_birth), "d MMM yyyy") : "-";

  return (
    <div className="flex flex-wrap gap-4">
      <div className="relative h-[54mm] w-[85.6mm] overflow-hidden rounded-[3mm] bg-white shadow-md ring-1 ring-brand-100 print:shadow-none">
        <div className="flex items-center gap-[2mm] bg-brand-800 px-[3mm] py-[2mm] text-white">
          <img src="/logo.png" alt="" className="h-[9mm] w-[9mm] rounded-full bg-white object-contain p-[0.5mm]" />
          <div className="leading-tight">
            <p className="font-headline text-[10pt] font-extrabold uppercase tracking-wide">{school.name}</p>
            <p className="text-[6pt] italic text-gold-400">{school.motto}</p>
          </div>
        </div>
        <div className="flex gap-[3mm] px-[3mm] pt-[2.5mm]">
          <div className="flex flex-col items-center gap-[1mm]">
            <LearnerAvatar student={student} size={78} className="rounded-[2mm] ring-2 ring-gold-400" />
            <span className="rounded bg-gold-400 px-[1.5mm] text-[6pt] font-bold uppercase text-brand-900">{student.is_boarder ? "Boarder" : "Day scholar"}</span>
          </div>
          <div className="min-w-0 flex-1 space-y-[0.8mm]">
            <p className="font-headline text-[11pt] font-extrabold uppercase leading-none text-brand-800">{student.full_name}</p>
            <p className="pb-[0.5mm] font-mono text-[8pt] font-bold text-brand-600">{student.admission_number}</p>
            <Row label="Class" value={student.classroom_name || "-"} />
            <Row label="Born" value={born} />
            <Row label="UPI" value={student.upi || "-"} />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gold-400 px-[3mm] py-[1mm] text-[6.5pt] font-bold uppercase text-brand-900">
          <span>Learner ID card</span>
          <span>Valid to Dec {year}</span>
        </div>
      </div>

      <div className="relative h-[54mm] w-[85.6mm] overflow-hidden rounded-[3mm] bg-white shadow-md ring-1 ring-brand-100 print:shadow-none">
        <div className="h-[3mm] bg-brand-800" />
        <div className="space-y-[1.8mm] px-[4mm] pt-[3mm] text-[7pt] text-brand-700">
          <p className="font-semibold text-brand-900">This card belongs to {school.name}. If found, please return it to the school.</p>
          <p>{school.address} · Tel {school.phone}</p>
          <div className="space-y-[0.6mm] rounded-[1.5mm] bg-brand-50 px-[2.5mm] py-[1.5mm]">
            <p className="text-[6pt] uppercase tracking-wide text-brand-400">Parent or guardian</p>
            <p className="font-semibold text-brand-900">{student.parent_name || "-"}</p>
            <p className="font-mono">{student.parent_phone || "-"}</p>
          </div>
          {student.route_name && <p>School bus: <span className="font-semibold">{student.route_name}</span></p>}
        </div>
        <div className="absolute inset-x-[4mm] bottom-[4mm] flex items-end justify-between text-[6pt] text-brand-500">
          <div className="w-[30mm] border-t border-brand-300 pt-[0.5mm] text-center">Head Teacher</div>
          <div className="w-[30mm] border-t border-brand-300 pt-[0.5mm] text-center">Learner</div>
        </div>
      </div>
    </div>
  );
}
