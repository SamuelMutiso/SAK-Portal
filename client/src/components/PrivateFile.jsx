import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../api/client";

export default function PrivateFile({ path, alt, className = "" }) {
  const [file, setFile] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url;
    let active = true;
    api.get(path.replace(/^\/api/, ""), { responseType: "blob" })
      .then(({ data }) => {
        url = URL.createObjectURL(data);
        if (active) setFile({ url, type: data.type });
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [path]);

  if (failed) return <p className="text-sm text-red-600">The file could not be loaded.</p>;
  if (!file) return <div className={`animate-pulse rounded-xl bg-brand-50 ${className}`} />;
  if (file.type === "application/pdf") {
    return (
      <a href={file.url} target="_blank" rel="noreferrer" className={`flex flex-col items-center justify-center gap-2 rounded-xl bg-brand-50 text-sm font-semibold text-brand-700 ${className}`}>
        <FileText size={32} /> Open the PDF slip
      </a>
    );
  }
  return (
    <a href={file.url} target="_blank" rel="noreferrer">
      <img src={file.url} alt={alt} className={`rounded-xl object-contain ring-1 ring-brand-100 ${className}`} />
    </a>
  );
}
