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
    <div className="mx-auto w-full max-w-[262mm] [container-type:inline-size]">
      <div className="aspect-[297/210] w-full bg-white p-[2.2cqw] shadow-md print:shadow-none">
        <div className="h-full border-[max(2px,0.3cqw)] border-gold-500 p-[1.1cqw]">
          <div className="flex h-full flex-col items-center justify-between border border-brand-700 px-[8cqw] py-[3.2cqw] text-center">
            <div className="flex flex-col items-center gap-[0.6cqw]">
              <img src="/logo.png" alt="" className="h-[7.5cqw] w-[7.5cqw] object-contain" />
              <p className="font-headline text-[2cqw] font-extrabold uppercase leading-tight tracking-[0.2em] text-brand-800">{school.name}</p>
              <p className="text-[1.2cqw] italic leading-tight text-gold-600">{school.motto}</p>
            </div>
            <div className="flex flex-col items-center gap-[1.1cqw]">
              <p className="font-headline text-[4.6cqw] font-extrabold uppercase leading-none tracking-wide text-brand-800">{wording.title}</p>
              <p className="text-[1.6cqw] leading-tight text-brand-500">This is to certify that</p>
              <p className="border-b-[max(1px,0.2cqw)] border-gold-400 px-[2.4cqw] pb-[0.4cqw] font-display text-[3.6cqw] font-bold leading-tight text-brand-900">{student.full_name}</p>
              <p className="max-w-[68cqw] text-[1.75cqw] leading-snug text-brand-700">
                of {completion.class}, admission number <span className="font-mono">{student.admission_number}</span>, {wording.line(completion.next)}
              </p>
              <p className="text-[1.35cqw] leading-tight text-brand-500">Awarded in {completion.year} · {school.curriculum}</p>
            </div>
            <div className="flex w-full items-end justify-between text-[1.35cqw] text-brand-600">
              <div className="w-[22cqw] border-t border-brand-400 pt-[0.4cqw]">Class Teacher</div>
              <Award className="h-[5.4cqw] w-[5.4cqw] text-gold-500" />
              <div className="w-[22cqw] border-t border-brand-400 pt-[0.4cqw]">Head Teacher</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
