import { Copy, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api, { errorMessage } from "../../api/client";
import ExamPicker from "../../components/ExamPicker";
import Loader from "../../components/Loader";
import { TERM, YEARS, formatKes } from "../../constants";

const CATEGORIES = ["tuition", "boarding", "meals", "transport", "activity", "exam", "other"];
const TYPES = { all: "All learners", day: "Day scholars", boarder: "Boarders" };
const ALL_TERMS = YEARS.flatMap((year) => [1, 2, 3].map((number) => `Term ${number} ${year}`));

function who(rate) {
  const parts = [];
  parts.push(rate.classroom_name || "All classes");
  if (rate.learner_type !== "all") parts.push(TYPES[rate.learner_type]);
  if (rate.route_name) parts.push(rate.route_name);
  return parts.join(" · ");
}

function estimate(rates, items, classroomId, type) {
  let total = 0;
  items.forEach((item) => {
    if (!item.is_active || item.category === "transport") return;
    const matching = rates.filter((rate) => rate.item_id === item.id && (!rate.classroom_id || rate.classroom_id === classroomId) && (rate.learner_type === "all" || rate.learner_type === type) && !rate.transport_route_id);
    if (!matching.length) return;
    const best = matching.sort((a, b) => (Boolean(b.classroom_id) + (b.learner_type !== "all")) - (Boolean(a.classroom_id) + (a.learner_type !== "all")))[0];
    total += best.amount;
  });
  return total;
}

function RateRow({ rate, readOnly, onSaved, onDelete }) {
  const [amount, setAmount] = useState(String(rate.amount));
  const changed = Number(amount) !== rate.amount;

  async function save() {
    const { data } = await api.patch(`/fees/rates/${rate.id}`, { amount: Number(amount) });
    onSaved(data);
  }

  return (
    <li className="flex items-center gap-3 py-1.5 text-sm">
      <span className="flex-1 text-brand-700">{who(rate)}</span>
      {readOnly ? <span className="font-mono">{formatKes(rate.amount)}</span> : (
        <>
          <input className="input w-28 py-1.5 text-right font-mono" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))} onKeyDown={(event) => event.key === "Enter" && changed && save()} />
          {changed ? <button className="btn-primary px-3 py-1.5 text-xs" onClick={save}>Save</button> : <button className="rounded-lg p-1.5 text-brand-300 hover:text-red-600" onClick={() => onDelete(rate)} aria-label="Remove amount"><Trash2 size={15} /></button>}
        </>
      )}
    </li>
  );
}

export default function FeeStructure() {
  const role = useSelector((state) => state.auth.user.role);
  const readOnly = role === "director";
  const [term, setTerm] = useState(TERM);
  const [data, setData] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [adding, setAdding] = useState(null);
  const [newItem, setNewItem] = useState({ name: "", category: "other" });
  const [newDiscount, setNewDiscount] = useState({ name: "", kind: "percent", value: "", applies_to: "tuition" });
  const [copyFrom, setCopyFrom] = useState("");
  const [message, setMessage] = useState(null);

  const load = useCallback(() => {
    api.get("/fees/structure", { params: { term } }).then(({ data: result }) => setData(result));
  }, [term]);

  useEffect(load, [load]);
  useEffect(() => {
    api.get("/transport").then(({ data: result }) => setRoutes(result));
    api.get("/fees/discounts").then(({ data: result }) => setDiscounts(result));
  }, []);

  async function addRate(event) {
    event.preventDefault();
    try {
      await api.post("/fees/rates", {
        item_id: adding.item_id, term,
        classroom_id: adding.classroom_id ? Number(adding.classroom_id) : null,
        learner_type: adding.learner_type,
        transport_route_id: adding.transport_route_id ? Number(adding.transport_route_id) : null,
        amount: Number(adding.amount),
      });
      setAdding(null);
      load();
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    }
  }

  async function removeRate(rate) {
    await api.delete(`/fees/rates/${rate.id}`);
    load();
  }

  async function addItem(event) {
    event.preventDefault();
    try {
      await api.post("/fees/items", { ...newItem, sort_order: data.items.length + 1 });
      setNewItem({ name: "", category: "other" });
      load();
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    }
  }

  async function addDiscount(event) {
    event.preventDefault();
    try {
      const { data: created } = await api.post("/fees/discounts", { ...newDiscount, value: Number(newDiscount.value) });
      setDiscounts([...discounts, created]);
      setNewDiscount({ name: "", kind: "percent", value: "", applies_to: "tuition" });
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    }
  }

  async function copy() {
    try {
      const { data: result } = await api.post("/fees/structure/copy", { from_term: copyFrom, to_term: term });
      setMessage({ type: "success", text: `${result.copied} amounts copied from ${copyFrom}. Change any that went up.` });
      load();
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    }
  }

  if (!data) return <Loader />;
  const empty = data.rates.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 className="page-title">Fee structure</h1>
          <p className="mt-2 max-w-2xl text-brand-500">What each learner pays per term. An amount for a specific class, boarders or a bus route overrides the general one.</p>
        </div>
        <ExamPicker term={term} showExam={false} onChange={(next) => setTerm(next.term)} />
      </div>

      {message && <p className={`rounded-xl px-4 py-3 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>}
      {data.invoiced > 0 && <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-600">{data.invoiced} invoices already exist for {term}. Changes here apply to new invoices only.</p>}

      {empty && !readOnly && (
        <div className="card flex flex-wrap items-end gap-3">
          <p className="w-full text-sm text-brand-600">No fees are set for {term} yet. Start from an earlier term:</p>
          <select className="input w-auto" value={copyFrom} onChange={(event) => setCopyFrom(event.target.value)}>
            <option value="">Choose a term</option>
            {ALL_TERMS.filter((item) => item !== term).map((item) => <option key={item}>{item}</option>)}
          </select>
          <button className="btn-primary" disabled={!copyFrom} onClick={copy}><Copy size={16} /> Copy fees</button>
        </div>
      )}

      {!empty && (
        <div className="card overflow-x-auto">
          <h2 className="font-semibold text-brand-800">Term bill per class, before transport and discounts</h2>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-brand-400">
              <tr><th className="py-1.5">Class</th><th className="py-1.5 text-right">Day scholar</th><th className="py-1.5 text-right">Boarder</th></tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {data.classes.map((classroom) => (
                <tr key={classroom.id}>
                  <td className="py-1.5 font-semibold text-brand-700">{classroom.name}</td>
                  <td className="py-1.5 text-right font-mono">{formatKes(estimate(data.rates, data.items, classroom.id, "day"))}</td>
                  <td className="py-1.5 text-right font-mono">{formatKes(estimate(data.rates, data.items, classroom.id, "boarder"))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {data.items.map((item) => {
          const rates = data.rates.filter((rate) => rate.item_id === item.id);
          return (
            <div key={item.id} className="card">
              <div className="flex items-baseline gap-2">
                <h3 className="flex-1 text-lg font-semibold text-brand-800">{item.name}</h3>
                <span className="badge bg-brand-100 text-brand-600">{item.category}</span>
              </div>
              {item.description && <p className="text-xs text-brand-400">{item.description}</p>}
              <ul className="mt-2 divide-y divide-brand-50">
                {rates.length === 0 && <li className="py-1.5 text-sm text-brand-400">Not charged in {term}.</li>}
                {rates.map((rate) => (
                  <RateRow key={`${rate.id}-${rate.amount}`} rate={rate} readOnly={readOnly} onSaved={load} onDelete={removeRate} />
                ))}
              </ul>
              {!readOnly && (adding?.item_id === item.id ? (
                <form onSubmit={addRate} className="mt-3 grid gap-2 rounded-xl bg-brand-50 p-3 sm:grid-cols-2">
                  <select className="input" value={adding.classroom_id} onChange={(event) => setAdding({ ...adding, classroom_id: event.target.value })}>
                    <option value="">All classes</option>
                    {data.classes.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}
                  </select>
                  {item.category === "transport" ? (
                    <select className="input" value={adding.transport_route_id} onChange={(event) => setAdding({ ...adding, transport_route_id: event.target.value })} required>
                      <option value="">Choose a bus route</option>
                      {routes.map((route) => <option key={route.id} value={route.id}>{route.name}</option>)}
                    </select>
                  ) : (
                    <select className="input" value={adding.learner_type} onChange={(event) => setAdding({ ...adding, learner_type: event.target.value })}>
                      {Object.entries(TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  )}
                  <input className="input font-mono" inputMode="numeric" placeholder="Amount (KES)" value={adding.amount} onChange={(event) => setAdding({ ...adding, amount: event.target.value.replace(/\D/g, "") })} required />
                  <div className="flex gap-2">
                    <button className="btn-primary flex-1">Add</button>
                    <button type="button" className="btn-ghost" onClick={() => setAdding(null)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <button className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline" onClick={() => setAdding({ item_id: item.id, classroom_id: "", learner_type: "all", transport_route_id: "", amount: "" })}><Plus size={15} /> Add an amount</button>
              ))}
            </div>
          );
        })}
      </div>

      {!readOnly && (
        <form onSubmit={addItem} className="card flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <label className="label" htmlFor="item">New fee item</label>
            <input id="item" className="input" placeholder="e.g. Swimming, Uniform, Computer lessons" value={newItem.name} onChange={(event) => setNewItem({ ...newItem, name: event.target.value })} required />
          </div>
          <select className="input w-auto" value={newItem.category} onChange={(event) => setNewItem({ ...newItem, category: event.target.value })}>
            {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
          </select>
          <button className="btn-primary"><Plus size={16} /> Add item</button>
        </form>
      )}

      <div className="card space-y-3">
        <h2 className="text-lg font-semibold text-brand-800">Discounts</h2>
        <ul className="divide-y divide-brand-50 text-sm">
          {discounts.map((discount) => (
            <li key={discount.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="flex-1 font-semibold">{discount.name}</span>
              <span className="text-brand-500">{discount.kind === "percent" ? `${discount.value}% off ${discount.applies_to}` : `${formatKes(discount.value)} off ${discount.applies_to}`}</span>
              <span className="badge bg-brand-100 text-brand-600">{discount.learners} learners</span>
            </li>
          ))}
        </ul>
        {!readOnly && (
          <form onSubmit={addDiscount} className="grid gap-2 rounded-xl bg-brand-50 p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
            <input className="input" placeholder="e.g. Second child" value={newDiscount.name} onChange={(event) => setNewDiscount({ ...newDiscount, name: event.target.value })} required />
            <select className="input" value={newDiscount.kind} onChange={(event) => setNewDiscount({ ...newDiscount, kind: event.target.value })}>
              <option value="percent">Percent</option>
              <option value="fixed">Fixed KES</option>
            </select>
            <input className="input font-mono" inputMode="numeric" placeholder={newDiscount.kind === "percent" ? "%" : "KES"} value={newDiscount.value} onChange={(event) => setNewDiscount({ ...newDiscount, value: event.target.value.replace(/\D/g, "") })} required />
            <select className="input" value={newDiscount.applies_to} onChange={(event) => setNewDiscount({ ...newDiscount, applies_to: event.target.value })}>
              {[...CATEGORIES, "all"].map((category) => <option key={category}>{category}</option>)}
            </select>
            <button className="btn-primary">Add</button>
          </form>
        )}
        <p className="text-xs text-brand-400">Give a learner a discount from their fee statement.</p>
      </div>
    </div>
  );
}
