import { MessageCircle } from "lucide-react";

function whatsappText(title, body) {
  return `*Success Academy Kitengela*\n*${title}*\n${body}\n\nParent portal: ${window.location.origin}`;
}

export default function WhatsAppShare({ title, body, label = "WhatsApp", className = "" }) {
  const link = `https://wa.me/?text=${encodeURIComponent(whatsappText(title, body))}`;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      title="Share to a WhatsApp group"
      className={`inline-flex items-center gap-1.5 rounded-lg bg-[#25D366]/15 px-2.5 py-1 text-xs font-semibold text-[#128C4A] transition hover:bg-[#25D366]/25 ${className}`}
    >
      <MessageCircle size={14} /> {label}
    </a>
  );
}
