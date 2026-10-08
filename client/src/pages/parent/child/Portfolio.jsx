import { format } from "date-fns";
import { useEffect, useState } from "react";
import api, { assetUrl } from "../../../api/client";
import Loader from "../../../components/Loader";

export default function Portfolio({ student }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    api.get(`/portfolio/student/${student.id}`).then(({ data }) => setItems(data));
  }, [student.id]);

  if (!items) return <Loader />;
  if (!items.length) return <p className="card text-sm text-brand-500">No portfolio work has been added yet.</p>;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <figure key={item.id} className="card overflow-hidden p-0">
          <img src={assetUrl(item.image_url)} alt={item.title} className="h-48 w-full object-cover" />
          <figcaption className="p-4">
            <p className="font-semibold text-brand-800">{item.title}</p>
            <p className="text-xs text-brand-500">{item.learning_area} · {format(new Date(item.created_at + "Z"), "d MMM yyyy")}</p>
            {item.description && <p className="mt-2 text-sm text-brand-600">{item.description}</p>}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
