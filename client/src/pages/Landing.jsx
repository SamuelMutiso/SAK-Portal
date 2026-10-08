import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Bus, ClipboardCheck, GraduationCap, MapPin, MessageSquare, Phone, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const SLIDES = [
  { photo: "/photos/assembly.jpg", headline: "Your child's school day, on your phone" },
  { photo: "/photos/graduation.jpg", headline: "Every report card, the day it's ready" },
  { photo: "/photos/play-time.jpg", headline: "From Playgroup to Grade 9, always in the loop" },
];

const FEATURES = [
  { icon: MessageSquare, title: "Notices by SMS", text: "Club reminders, bus delays and school events arrive as a text, even on a basic phone." },
  { icon: GraduationCap, title: "Report cards", text: "Opener, Mid-Term and End-Term marks with CBC levels, ready to print." },
  { icon: ClipboardCheck, title: "Attendance", text: "See the register the same day your child's teacher marks it." },
  { icon: BookOpen, title: "Homework", text: "Assignments and due dates straight from the class teacher." },
  { icon: Wallet, title: "Fee balance", text: "Know what is outstanding and the account number to pay with." },
  { icon: Bus, title: "School bus", text: "Your child's route, stops and driver contact on a map." },
];

const LIFE = [
  { photo: "/photos/performing-arts.jpg", title: "Performing arts", className: "md:col-span-2 md:row-span-2" },
  { photo: "/photos/graduation.jpg", title: "Graduation day", className: "" },
  { photo: "/photos/school-trip.jpg", title: "Class trips", className: "" },
  { photo: "/photos/swings.jpg", title: "Pre-primary play", className: "" },
  { photo: "/photos/choir.jpg", title: "Choir and music", className: "" },
];

const SMS_SAMPLES = [
  "Success Academy: Swimming this Thursday. Members should carry costumes and towels.",
  "Success Academy: Mid-Term results are out. View Ethan's report card on the parent portal.",
  "Success Academy: Dear parent, Ethan's fee balance is KES 12,000. Pay via the school Paybill, account SAK0001.",
];

export default function Landing() {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;
    const timer = setInterval(() => setSlide((current) => (current + 1) % SLIDES.length), 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <section className="relative flex min-h-[92vh] flex-col overflow-hidden bg-brand-900">
        <AnimatePresence>
          <motion.img
            key={SLIDES[slide].photo}
            src={SLIDES[slide].photo}
            alt=""
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4 }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>
        <div className="photo-overlay absolute inset-0" />

        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-5 md:px-8">
          <img src="/logo.png" alt="Success Academy crest" className="h-14 w-14 rounded-full bg-white object-contain p-1" />
          <div className="leading-tight text-white">
            <p className="font-headline text-xl font-bold uppercase tracking-wide">Success Academy</p>
            <p className="text-xs text-brand-200">Kitengela · Parent Portal</p>
          </div>
          <Link to="/login" className="btn-gold ml-auto">
            Sign in
          </Link>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 pb-20 md:px-8">
          <p className="font-headline text-lg font-bold tracking-wide text-gold-400 md:text-2xl">#InPursuitOfExcellence</p>
          <AnimatePresence mode="wait">
            <motion.h1
              key={slide}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="mt-3 max-w-3xl font-headline text-5xl font-extrabold uppercase leading-[0.95] text-white sm:text-6xl md:text-8xl"
            >
              {SLIDES[slide].headline}
            </motion.h1>
          </AnimatePresence>
          <p className="mt-6 max-w-xl text-lg text-brand-100">
            Notices, report cards, attendance, homework and fees for Success Academy Kitengela families, in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/login" className="btn-gold px-7 py-3.5 text-base">
              Open the parent portal
            </Link>
            <a href="https://successacademykitengela.com" className="btn border-2 border-white/70 px-7 py-3.5 text-base text-white hover:bg-white hover:text-brand-800">
              Visit school website
            </a>
          </div>

          <div className="mt-12 flex gap-2">
            {SLIDES.map((item, index) => (
              <button
                key={item.photo}
                onClick={() => setSlide(index)}
                aria-label={`Show slide ${index + 1}`}
                className={`h-2.5 rounded-full transition-all ${index === slide ? "w-10 bg-gold-400" : "w-2.5 bg-white/60 hover:bg-white"}`}
              />
            ))}
          </div>
        </div>
      </section>

      <div className="uniform-check h-5" />

      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-20 md:grid-cols-5 md:px-8">
        <div className="md:col-span-3">
          <h2 className="font-headline text-4xl font-extrabold uppercase text-brand-800 md:text-5xl">What parents see in the portal</h2>
          <p className="mt-3 max-w-lg text-brand-600">Everything you would normally call the school office to ask, available any time.</p>
          <div className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-600">
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-brand-800">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-brand-600">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="mx-auto max-w-xs rounded-[2.5rem] border-[10px] border-brand-800 bg-brand-50 p-4 shadow-2xl">
            <p className="text-center text-xs font-semibold text-brand-500">Messages · SUCCESSACAD</p>
            {SMS_SAMPLES.map((text) => (
              <div key={text} className="mt-3 rounded-2xl rounded-tl-sm bg-white p-3 text-sm text-brand-800 shadow-sm">
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-50 py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <h2 className="font-headline text-4xl font-extrabold uppercase text-brand-800 md:text-5xl">Life at Success Academy</h2>
          <div className="mt-8 grid auto-rows-[200px] gap-3 md:grid-cols-4">
            {LIFE.map((item) => (
              <figure key={item.title} className={`group relative overflow-hidden rounded-2xl ${item.className}`}>
                <img src={item.photo} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-900/85 to-transparent p-4 pt-10 font-headline text-xl font-bold uppercase text-white">
                  {item.title}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden">
        <img src="/photos/parents-day.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="photo-overlay absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 md:px-8">
          <h2 className="max-w-2xl font-headline text-4xl font-extrabold uppercase leading-none text-white md:text-6xl">
            Stay close to your child&apos;s school life
          </h2>
          <p className="mt-4 max-w-lg text-brand-100">Your login details are sent by the school office. Lost them? Call the secretary on 0748 065 956.</p>
          <Link to="/login" className="btn-gold mt-8 px-7 py-3.5 text-base">
            Sign in
          </Link>
        </div>
      </section>

      <footer className="bg-brand-900 text-brand-200">
        <div className="uniform-check h-3 opacity-80" />
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3 md:px-8">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Success Academy crest" className="h-14 w-14 rounded-full bg-white object-contain p-1" />
            <div>
              <p className="font-headline text-xl font-bold uppercase text-white">Success Academy</p>
              <p className="text-sm italic">In pursuit of excellence</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2"><MapPin size={16} className="text-gold-400" /> Prison Road, Kitengela, Kajiado County</p>
            <p className="flex items-center gap-2"><Phone size={16} className="text-gold-400" /> Office 0748 065 956 · Admissions 0729 948 896</p>
          </div>
          <p className="text-sm md:text-right">© {new Date().getFullYear()} Success Academy Kitengela</p>
        </div>
      </footer>
    </div>
  );
}
