import { Award } from "lucide-react";

const WORDING = {
  pp2: { title: "Graduation Certificate", line: (next) => `has graduated from Pre-Primary and is ready to join ${next}. Congratulations on this wonderful first milestone!` },
  grade6: { title: "Certificate of Completion", line: (next) => `has successfully completed Primary School and moves on to ${next}. Well done!` },
  grade9: { title: "Certificate of Completion", line: (next) => `has successfully completed Junior School and moves on to ${next}. We wish you every success.` },
};

export default function CompletionCertificate({ doc, completion }) {
  const { student, school } = doc;
  const wording = WORDING[completion.key];

  return (
    <div className="relative mx-auto aspect-[297/210] w-full max-w-[262mm] bg-white p-[6mm] shadow-md print:shadow-none">
      <div className="flex h-full flex-col items-center justify-between border-[3px] border-gold-500 p-[3mm]">
        <div className="flex h-full w-full flex-col items-center justify-between border border-brand-700 px-[10%] py-[5%] text-center">
          <div className="flex flex-col items-center gap-2">
            <img src="/logo.png" alt="" className="h-[22mm] w-[22mm] object-contain" />
            <p className="font-headline text-xl font-extrabold uppercase tracking-[0.2em] text-brand-800">{school.name}</p>
            <p className="text-xs italic text-gold-600">{school.motto}</p>
          </div>
          <div className="space-y-3">
            <p className="font-headline text-5xl font-extrabold uppercase tracking-wide text-brand-800">{wording.title}</p>
            <p className="text-base text-brand-500">This is to certify that</p>
            <p className="border-b-2 border-gold-400 px-6 pb-1 font-display text-4xl font-bold text-brand-900">{student.full_name}</p>
            <p className="mx-auto max-w-[180mm] text-lg text-brand-700">
              of {completion.class}, admission number <span className="font-mono">{student.admission_number}</span>, {wording.line(completion.next)}
            </p>
            <p className="text-sm text-brand-500">Awarded in {completion.year} · {school.curriculum}</p>
          </div>
          <div className="flex w-full items-end justify-between text-sm text-brand-600">
            <div className="w-[60mm] border-t border-brand-400 pt-1">Class Teacher</div>
            <Award size={56} className="text-gold-500" />
            <div className="w-[60mm] border-t border-brand-400 pt-1">Head Teacher</div>
          </div>
        </div>
      </div>
    </div>
  );
}
