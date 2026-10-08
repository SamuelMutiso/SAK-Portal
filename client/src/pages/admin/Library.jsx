import { format, isBefore, startOfToday } from "date-fns";
import { BookPlus } from "lucide-react";
import { useEffect, useState } from "react";
import api, { errorMessage } from "../../api/client";
import Loader from "../../components/Loader";

export default function Library() {
  const [books, setBooks] = useState(null);
  const [loans, setLoans] = useState([]);
  const [lend, setLend] = useState({ book_id: "", admission_number: "" });
  const [newBook, setNewBook] = useState({ title: "", author: "", copies: 1 });
  const [message, setMessage] = useState(null);

  function load() {
    api.get("/library/books").then(({ data }) => setBooks(data));
    api.get("/library/loans").then(({ data }) => setLoans(data));
  }

  useEffect(load, []);

  async function handleLend(event) {
    event.preventDefault();
    try {
      const { data } = await api.post("/library/loans", { ...lend, book_id: Number(lend.book_id) });
      setMessage({ type: "success", text: `${data.book_title} lent to ${data.student_name}, due ${format(new Date(data.due_on), "d MMM")}.` });
      setLend({ book_id: "", admission_number: "" });
      load();
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    }
  }

  async function handleReturn(id) {
    await api.post(`/library/loans/${id}/return`);
    load();
  }

  async function handleAddBook(event) {
    event.preventDefault();
    try {
      await api.post("/library/books", { ...newBook, copies: Number(newBook.copies) });
      setNewBook({ title: "", author: "", copies: 1 });
      load();
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    }
  }

  if (!books) return <Loader />;

  const today = startOfToday();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Library</h1>
        <p className="mt-2 text-brand-500">Lend books by admission number. Parents see what their child has borrowed.</p>
      </div>

      {message && (
        <p className={`rounded-xl px-4 py-3 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleLend} className="card space-y-3">
          <h2 className="font-semibold text-brand-800">Lend a book</h2>
          <select className="input" value={lend.book_id} onChange={(event) => setLend({ ...lend, book_id: event.target.value })} required>
            <option value="">Choose a book...</option>
            {books.map((book) => (
              <option key={book.id} value={book.id} disabled={book.available < 1}>
                {book.title} ({book.available} of {book.copies} available)
              </option>
            ))}
          </select>
          <input className="input font-mono uppercase" placeholder="Admission number, e.g. SAK0001" value={lend.admission_number} onChange={(event) => setLend({ ...lend, admission_number: event.target.value })} required />
          <button className="btn-primary w-full">Lend for 14 days</button>
        </form>

        <form onSubmit={handleAddBook} className="card space-y-3">
          <h2 className="font-semibold text-brand-800">Add a book</h2>
          <input className="input" placeholder="Title" value={newBook.title} onChange={(event) => setNewBook({ ...newBook, title: event.target.value })} required />
          <div className="grid grid-cols-3 gap-3">
            <input className="input col-span-2" placeholder="Author" value={newBook.author} onChange={(event) => setNewBook({ ...newBook, author: event.target.value })} />
            <input className="input" type="number" min="1" value={newBook.copies} onChange={(event) => setNewBook({ ...newBook, copies: event.target.value })} aria-label="Copies" />
          </div>
          <button className="btn-ghost w-full"><BookPlus size={16} /> Add to catalogue</button>
        </form>
      </div>

      <div className="card p-0">
        <h2 className="px-5 pt-5 font-semibold text-brand-800">Books out ({loans.length})</h2>
        <ul className="mt-3 divide-y divide-brand-50">
          {loans.map((loan) => {
            const overdue = isBefore(new Date(loan.due_on), today);
            return (
              <li key={loan.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <div className="flex-1">
                  <p className="font-semibold">{loan.book_title}</p>
                  <p className="text-brand-500">{loan.student_name} · {loan.classroom_name}</p>
                </div>
                <span className={`badge ${overdue ? "bg-red-100 text-red-700" : "bg-brand-50 text-brand-600"}`}>
                  {overdue ? "Overdue since" : "Due"} {format(new Date(loan.due_on), "d MMM")}
                </span>
                <button className="btn-ghost px-3 py-1.5" onClick={() => handleReturn(loan.id)}>Mark returned</button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
