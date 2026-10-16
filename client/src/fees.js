export const METHODS = ["Paybill", "M-Pesa", "Bank", "Cash", "Cheque"];

export const INVOICE_STYLES = {
  paid: "bg-emerald-100 text-emerald-700",
  partial: "bg-amber-100 text-amber-700",
  unpaid: "bg-red-100 text-red-700",
  cancelled: "bg-brand-100 text-brand-400 line-through",
};

export const METHOD_STYLES = {
  Paybill: "bg-emerald-100 text-emerald-700",
  "M-Pesa": "bg-emerald-100 text-emerald-700",
  Bank: "bg-sky-100 text-sky-700",
  Cash: "bg-gold-100 text-gold-600",
  Cheque: "bg-violet-100 text-violet-700",
};

const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function belowThousand(number) {
  const hundreds = Math.floor(number / 100);
  const rest = number % 100;
  const parts = [];
  if (hundreds) parts.push(`${ONES[hundreds]} hundred`);
  if (rest) {
    const words = rest < 20 ? ONES[rest] : `${TENS[Math.floor(rest / 10)]}${rest % 10 ? `-${ONES[rest % 10]}` : ""}`;
    parts.push(hundreds ? `and ${words}` : words);
  }
  return parts.join(" ");
}

export function amountInWords(amount) {
  let number = Math.round(Math.abs(Number(amount) || 0));
  if (number === 0) return "Zero shillings only";
  const parts = [];
  for (const [size, name] of [[1000000, "million"], [1000, "thousand"]]) {
    if (number >= size) {
      parts.push(`${belowThousand(Math.floor(number / size))} ${name}`);
      number %= size;
    }
  }
  if (number) parts.push(belowThousand(number));
  const text = parts.join(" ");
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} shillings only`;
}

export function balanceLabel(balance) {
  if (balance > 0) return "Balance due";
  if (balance < 0) return "In credit";
  return "Fully paid";
}
