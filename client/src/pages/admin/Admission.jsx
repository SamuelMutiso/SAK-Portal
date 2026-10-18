import { ArrowLeft, ArrowRight, Check, KeyRound, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../api/client";
import SmsPreview from "../../components/SmsPreview";

const STEPS = ["Learner", "Class", "Guardians", "Health"];
const RELATIONSHIPS = ["Mother", "Father", "Guardian", "Grandparent", "Aunt", "Uncle", "Sibling", "Other"];

const EMPTY = {
  first_name: "", last_name: "", gender: "", date_of_birth: "", upi: "", assessment_number: "", previous_school: "", home_address: "",
  classroom_id: "", is_boarder: false, transport_route_id: "", transport_stop: "", admission_date: new Date().toISOString().slice(0, 10),
  guardian: { full_name: "", phone: "", email: "", relationship: "Mother" },
  guardian2: { full_name: "", phone: "", relationship: "Father" },
  emergency_contact_name: "", emergency_contact_phone: "",
  allergies: "", medical_conditions: "",
};

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-brand-400">{hint}</p>}
    </div>
  );
}

export default function Admission() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [classes, setClasses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [nextNumber, setNextNumber] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.get("/classes").then(({ data }) => setClasses(data));
    api.get("/transport").then(({ data }) => setRoutes(data));
    api.get("/students/next-admission-number").then(({ data }) => setNextNumber(data.admission_number));
  }, []);

  function set(field, value) {
    setForm({ ...form, [field]: value });
  }

  function setGuardian(key, field, value) {
    setForm({ ...form, [key]: { ...form[key], [field]: value } });
  }

  function problem() {
    if (step === 0) {
      if (!form.first_name.trim() || !form.last_name.trim()) return "Enter the learner's first and last name.";
      if (!form.gender) return "Choose the learner's gender.";
      if (!form.date_of_birth) return "Enter the date of birth.";
    }
    if (step === 1 && !form.classroom_id) return "Choose the class the learner is joining.";
    if (step === 2) {
      if (!form.guardian.full_name.trim()) return "Enter the parent or guardian's name.";
      if (!/^(\+?254|0)[17]\d{8}$/.test(form.guardian.phone.replace(/\s/g, ""))) return "Enter a Kenyan phone number like 0712345678.";
    }
    return null;
  }

  function next() {
    const issue = problem();
    setError(issue);
    if (!issue) setStep(step + 1);
  }

  async function submit() {
    const issue = problem();
    if (issue) {
      setError(issue);
      return;
    }
    const blank = (value) => (value === "" ? null : value);
    const payload = {
      ...Object.fromEntries(Object.entries(form).map(([key, value]) => [key, typeof value === "string" ? blank(value.trim()) : value])),
      classroom_id: Number(form.classroom_id),
      transport_route_id: form.is_boarder || !form.transport_route_id ? null : Number(form.transport_route_id),
      guardian: { ...form.guardian, phone: form.guardian.phone.replace(/\s/g, ""), email: blank(form.guardian.email.trim()) },
      guardian2: form.guardian2.full_name.trim() ? form.guardian2 : {},
    };
    setSaving(true);
    try {
      const { data } = await api.post("/students/admit", payload);
      setResult(data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
    setSaving(false);
  }

  if (result) {
    const { student, parent } = result;
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="card text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check size={28} /></span>
          <h1 className="mt-4 font-headline text-4xl font-extrabold uppercase text-brand-800">{student.full_name} is admitted</h1>
          <p className="mt-2 text-brand-500">{student.classroom_name}</p>
          <p className="mx-auto mt-4 inline-block rounded-xl bg-gold-100 px-5 py-3 font-mono text-2xl font-semibold text-brand-800">{student.admission_number}</p>
        </div>

        <div className="card space-y-2">
          <h2 className="font-semibold text-brand-800">Parent account</h2>
          {parent.is_new ? (
            <>
              <p className="text-sm text-brand-600">A new parent account was created for <strong>{parent.full_name}</strong> and the login details were sent by SMS. They choose their own password the first time they sign in.</p>
              <div className="grid gap-2 rounded-xl bg-brand-50 p-4 font-mono text-sm sm:grid-cols-2">
                <p><span className="block font-body text-xs text-brand-400">Sign in with phone number</span>{parent.phone}</p>
                <p><span className="block font-body text-xs text-brand-400">Temporary password</span><span className="inline-flex items-center gap-1.5"><KeyRound size={14} className="text-gold-600" />{result.temporary_password}</span></p>
              </div>
            </>
          ) : (
            <p className="text-sm text-brand-600"><strong>{parent.full_name}</strong> already has a parent account, so {student.first_name} was added to it. They now see {parent.children} children when they sign in.</p>
          )}
        </div>

        <SmsPreview sms={result.sms} onClose={() => setResult({ ...result, sms: { ...result.sms, message: null } })} />

        <div className="flex flex-wrap gap-3">
          <Link to={`/admin/students/${student.id}`} className="btn-primary">Open learner profile</Link>
          <button
            className="btn-ghost"
            onClick={() => {
              setForm(EMPTY);
              setStep(0);
              setResult(null);
              api.get("/students/next-admission-number").then(({ data }) => setNextNumber(data.admission_number));
            }}
          >
            <UserPlus size={16} /> Admit another learner
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/admin/students" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline"><ArrowLeft size={16} /> All learners</Link>
      <div>
        <h1 className="page-title">Admit a learner</h1>
        <p className="mt-2 text-brand-500">Admission number <span className="font-mono font-semibold text-brand-800">{nextNumber}</span> will be given automatically.</p>
      </div>

      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((label, index) => (
          <li key={label} className={`rounded-xl px-3 py-2 text-center text-sm font-semibold ${index === step ? "bg-brand-700 text-white" : index < step ? "bg-emerald-100 text-emerald-700" : "bg-brand-50 text-brand-400"}`}>
            <span className="font-mono">{index + 1}</span> {label}
          </li>
        ))}
      </ol>

      <div className="card space-y-4">
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name"><input className="input" value={form.first_name} onChange={(event) => set("first_name", event.target.value)} /></Field>
            <Field label="Last name"><input className="input" value={form.last_name} onChange={(event) => set("last_name", event.target.value)} /></Field>
            <Field label="Gender">
              <div className="flex gap-2">
                {["Male", "Female"].map((item) => (
                  <button key={item} type="button" onClick={() => set("gender", item)} className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${form.gender === item ? "bg-brand-700 text-white" : "bg-brand-50 text-brand-600"}`}>{item}</button>
                ))}
              </div>
            </Field>
            <Field label="Date of birth"><input type="date" className="input" value={form.date_of_birth} onChange={(event) => set("date_of_birth", event.target.value)} /></Field>
            <Field label="UPI (NEMIS)" hint="Optional. From the previous school or the Ministry."><input className="input font-mono uppercase" value={form.upi} onChange={(event) => set("upi", event.target.value.toUpperCase())} /></Field>
            <Field label="KNEC assessment number" hint="Grade 3 and above, if they have one."><input className="input font-mono" value={form.assessment_number} onChange={(event) => set("assessment_number", event.target.value)} /></Field>
            <Field label="Previous school"><input className="input" value={form.previous_school} onChange={(event) => set("previous_school", event.target.value)} /></Field>
            <Field label="Home area"><input className="input" placeholder="e.g. Milimani, Kitengela" value={form.home_address} onChange={(event) => set("home_address", event.target.value)} /></Field>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Class">
              <select className="input" value={form.classroom_id} onChange={(event) => set("classroom_id", event.target.value)}>
                <option value="">Choose a class</option>
                {classes.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.student_count} learners)</option>)}
              </select>
            </Field>
            <Field label="Admission date"><input type="date" className="input" value={form.admission_date} onChange={(event) => set("admission_date", event.target.value)} /></Field>
            <Field label="Day scholar or boarder">
              <div className="flex gap-2">
                {[[false, "Day scholar"], [true, "Boarder"]].map(([value, label]) => (
                  <button key={label} type="button" onClick={() => set("is_boarder", value)} className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${form.is_boarder === value ? "bg-brand-700 text-white" : "bg-brand-50 text-brand-600"}`}>{label}</button>
                ))}
              </div>
            </Field>
            {!form.is_boarder && (
              <Field label="School bus">
                <select className="input" value={form.transport_route_id} onChange={(event) => setForm({ ...form, transport_route_id: event.target.value, transport_stop: "" })}>
                  <option value="">Does not use the bus</option>
                  {routes.map((route) => <option key={route.id} value={route.id}>{route.name}</option>)}
                </select>
              </Field>
            )}
            {!form.is_boarder && form.transport_route_id && (
              <Field label="Bus stop">
                <select className="input" value={form.transport_stop} onChange={(event) => set("transport_stop", event.target.value)}>
                  <option value="">Choose the stop</option>
                  {(routes.find((route) => route.id === Number(form.transport_route_id))?.stops || []).slice(1).map((stop) => <option key={stop.name}>{stop.name}</option>)}
                </select>
              </Field>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-semibold text-brand-800">Main parent or guardian</h2>
              <p className="text-xs text-brand-400">Gets the portal login and the SMS messages. If this phone number or email already has a parent account (a brother or sister is already here), the learner is added to it.</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label="Full name"><input className="input" value={form.guardian.full_name} onChange={(event) => setGuardian("guardian", "full_name", event.target.value)} /></Field>
                <Field label="Relationship">
                  <select className="input" value={form.guardian.relationship} onChange={(event) => setGuardian("guardian", "relationship", event.target.value)}>
                    {RELATIONSHIPS.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Phone"><input className="input font-mono" placeholder="0712 345 678" value={form.guardian.phone} onChange={(event) => setGuardian("guardian", "phone", event.target.value)} /></Field>
                <Field label="Email" hint="Optional. Parents can always sign in with their phone number."><input type="email" className="input" value={form.guardian.email} onChange={(event) => setGuardian("guardian", "email", event.target.value)} /></Field>
              </div>
            </div>
            <div>
              <h2 className="font-semibold text-brand-800">Second parent or guardian <span className="text-xs font-normal text-brand-400">(optional)</span></h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <Field label="Full name"><input className="input" value={form.guardian2.full_name} onChange={(event) => setGuardian("guardian2", "full_name", event.target.value)} /></Field>
                <Field label="Phone"><input className="input font-mono" value={form.guardian2.phone} onChange={(event) => setGuardian("guardian2", "phone", event.target.value)} /></Field>
                <Field label="Relationship">
                  <select className="input" value={form.guardian2.relationship} onChange={(event) => setGuardian("guardian2", "relationship", event.target.value)}>
                    {RELATIONSHIPS.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
              </div>
            </div>
            <div>
              <h2 className="font-semibold text-brand-800">Emergency contact</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label="Name"><input className="input" value={form.emergency_contact_name} onChange={(event) => set("emergency_contact_name", event.target.value)} /></Field>
                <Field label="Phone"><input className="input font-mono" value={form.emergency_contact_phone} onChange={(event) => set("emergency_contact_phone", event.target.value)} /></Field>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-600">Health details are private. Only the school office, the class teacher and the learner&apos;s own parents can see them.</p>
            <Field label="Allergies"><input className="input" placeholder="e.g. Peanuts, penicillin. Leave blank if none." value={form.allergies} onChange={(event) => set("allergies", event.target.value)} /></Field>
            <Field label="Medical conditions"><textarea rows={3} className="input" placeholder="e.g. Asthma, uses an inhaler. Leave blank if none." value={form.medical_conditions} onChange={(event) => set("medical_conditions", event.target.value)} /></Field>
          </div>
        )}

        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex justify-between gap-3 border-t border-brand-100 pt-4">
          <button className="btn-ghost" onClick={() => setStep(step - 1)} disabled={step === 0}><ArrowLeft size={16} /> Back</button>
          {step < STEPS.length - 1 ? (
            <button className="btn-primary" onClick={next}>Next <ArrowRight size={16} /></button>
          ) : (
            <button className="btn-gold" onClick={submit} disabled={saving}>{saving ? "Admitting..." : "Admit learner"}</button>
          )}
        </div>
      </div>
    </div>
  );
}
