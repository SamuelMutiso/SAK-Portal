import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export default function PasswordInput({ className = "input", ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`${className} pr-11`} />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-brand-400 hover:text-brand-700 focus:text-brand-700 focus:outline-none"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
