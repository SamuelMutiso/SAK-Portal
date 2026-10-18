import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const down = () => setOffline(true);
    const up = () => setOffline(false);
    window.addEventListener("offline", down);
    window.addEventListener("online", up);
    return () => {
      window.removeEventListener("offline", down);
      window.removeEventListener("online", up);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-semibold text-brand-900 print:hidden" role="status">
      <WifiOff size={16} /> You are offline. Connect to the internet to see the latest information.
    </div>
  );
}
