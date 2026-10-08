import { Phone, Trash2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import api, { errorMessage } from "../../../api/client";
import Loader from "../../../components/Loader";

const EMPTY = { full_name: "", relationship: "", phone: "" };

export default function Safety({ student }) {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [emergency, setEmergency] = useState({ name: "", phone: "" });
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api.get(`/pickups/student/${student.id}`).then(({ data: result }) => {
      setData(result);
      setEmergency({ name: result.emergency_contact.name || "", phone: result.emergency_contact.phone || "" });
    });
  }, [student.id]);

  async function addPerson(event) {
    event.preventDefault();
    try {
      const { data: person } = await api.post(`/pickups/student/${student.id}`, form);
      setData({ ...data, pickups: [...data.pickups, person] });
      setForm(EMPTY);
      setMessage(null);
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    }
  }

  async function removePerson(id) {
    await api.delete(`/pickups/${id}`);
    setData({ ...data, pickups: data.pickups.filter((person) => person.id !== id) });
  }

  async function saveEmergency(event) {
    event.preventDefault();
    await api.put(`/pickups/student/${student.id}/emergency`, emergency);
    setMessage({ type: "success", text: "Emergency contact saved." });
  }

  if (!data) return <Loader />;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card">
        <h3 className="font-semibold text-brand-800">Who can pick up {student.first_name}</h3>
        <p className="text-sm text-brand-500">The gate will only release {student.first_name} to you or the people listed here.</p>
        <ul className="mt-4 space-y-2">
          {data.pickups.map((person) => (
            <li key={person.id} className="flex items-center gap-3 rounded-xl bg-brand-50 px-3 py-2 text-sm">
              <div className="flex-1">
                <p className="font-semibold">{person.full_name}</p>
                <p className="text-xs text-brand-500">{person.relationship} · <span className="font-mono">{person.phone}</span></p>
              </div>
              <button onClick={() => removePerson(person.id)} className="rounded-lg p-1.5 text-brand-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${person.full_name}`}>
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={addPerson} className="mt-4 grid gap-2 sm:grid-cols-3">
          <input className="input sm:col-span-3" placeholder="Full name" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} required />
          <input className="input" placeholder="Relationship" value={form.relationship} onChange={(event) => setForm({ ...form, relationship: event.target.value })} required />
          <input className="input sm:col-span-2" placeholder="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
          <button className="btn-ghost sm:col-span-3"><UserPlus size={16} /> Add person</button>
        </form>
      </div>

      <form onSubmit={saveEmergency} className="card h-fit space-y-3">
        <h3 className="flex items-center gap-2 font-semibold text-brand-800"><Phone size={18} /> Emergency contact</h3>
        <p className="text-sm text-brand-500">Who should the school call if they cannot reach you?</p>
        <input className="input" placeholder="Name" value={emergency.name} onChange={(event) => setEmergency({ ...emergency, name: event.target.value })} />
        <input className="input" placeholder="Phone" value={emergency.phone} onChange={(event) => setEmergency({ ...emergency, phone: event.target.value })} />
        <button className="btn-primary w-full">Save emergency contact</button>
        {message && (
          <p className={`rounded-xl px-3 py-2 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>
        )}
      </form>
    </div>
  );
}
