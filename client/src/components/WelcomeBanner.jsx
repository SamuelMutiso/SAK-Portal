import { format } from "date-fns";

export default function WelcomeBanner({ photo, title, subtitle, children }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-brand-900 print:hidden">
      <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="photo-overlay absolute inset-0" />
      <div className="relative flex flex-col gap-4 p-6 md:flex-row md:items-end md:p-8">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gold-400">{format(new Date(), "EEEE d MMMM yyyy")}</p>
          <h1 className="mt-1 font-headline text-4xl font-extrabold uppercase leading-none text-white md:text-5xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-xl text-brand-100">{subtitle}</p>}
        </div>
        {children}
      </div>
      <div className="uniform-check h-2.5" />
    </section>
  );
}
