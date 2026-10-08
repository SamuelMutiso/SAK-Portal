import { motion, useReducedMotion } from "framer-motion";
import {
  BellRing,
  BookOpen,
  Bus,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Link } from "react-router-dom";

const DAY = [
  { time: "7:12 AM", icon: Bus, title: "Ethan boarded the bus", text: "The driver taps one button and you get an SMS. No more guessing at the gate.", tone: "bg-amber-100 text-amber-700" },
  { time: "8:00 AM", icon: CalendarClock, title: "Mathematics, then English", text: "The day's timetable is on your phone, so you know what to pack the night before.", tone: "bg-sky-100 text-sky-700" },
  { time: "10:40 AM", icon: ClipboardCheck, title: "Marked present", text: "The class teacher marks the register and you see it the same morning.", tone: "bg-emerald-100 text-emerald-700" },
  { time: "3:30 PM", icon: Trophy, title: "4K Club: harvesting kale", text: "Club news, leaders and upcoming activities, straight from the teacher in charge.", tone: "bg-violet-100 text-violet-700" },
  { time: "6:15 PM", icon: BookOpen, title: "Homework: fractions practice", text: "Due Thursday. Tap 'Seen' so the teacher knows you have it.", tone: "bg-rose-100 text-rose-700" },
];

const ROLES = [
  {
    title: "Parents",
    photo: "/photos/parents-day.jpg",
    points: ["Report cards for every term, ready to print", "Progress trends across the whole year", "Pay fees with M-Pesa and get a receipt by SMS", "Approve who can pick up your child"],
  },
  {
    title: "Teachers",
    photo: "/photos/class-teacher.jpg",
    points: ["One-tap register and CBC grade sheets", "Competencies, values and comments in one place", "Photo portfolio of learners' projects", "Daily diary for Playgroup and PP"],
  },
  {
    title: "The school office",
    photo: "/photos/graduation.jpg",
    points: ["SMS a class, club, bus route or the whole school", "KNEC SBA tracker with CSV export", "Fees, leave-out, library and timetables", "See which parents have read each notice"],
  },
];

const GALLERY = [
  { photo: "/photos/performing-arts.jpg", title: "Performing arts" },
  { photo: "/photos/school-trip.jpg", title: "Class trips" },
  { photo: "/photos/swings.jpg", title: "Pre-primary play" },
  { photo: "/photos/choir.jpg", title: "Choir and music" },
];

function FloatingCard({ className, delay, children }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.6, ease: "easeOut" }}
      className={`absolute rounded-2xl bg-white p-3.5 shadow-[0_18px_40px_-12px_rgba(12,26,54,0.35)] ring-1 ring-brand-100 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function HeroCollage() {
  return (
    <div className="relative mx-auto h-[460px] w-full max-w-[540px] sm:h-[520px]">
      <div className="absolute right-6 top-4 h-[300px] w-[62%] rotate-2 overflow-hidden rounded-[2rem] border-[6px] border-white shadow-2xl sm:h-[340px]">
        <img src="/photos/choir.jpg" alt="Success Academy learners in uniform" className="h-full w-full object-cover" />
      </div>
      <div className="absolute bottom-6 left-2 h-[220px] w-[52%] -rotate-3 overflow-hidden rounded-[2rem] border-[6px] border-white shadow-2xl sm:h-[250px]">
        <img src="/photos/swings.jpg" alt="Pre-primary learners at play" className="h-full w-full object-cover" />
      </div>
      <div className="absolute bottom-0 right-0 h-28 w-28 rounded-full bg-gold-400/80 blur-2xl" />

      <FloatingCard className="left-0 top-10 w-60" delay={0.5}>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-400"><MessageSquare size={12} /> SMS · SUCCESSACAD</p>
        <p className="mt-1.5 text-xs leading-snug text-brand-800">Ethan boarded the school bus at 7:12 AM (Kitengela Town Route).</p>
      </FloatingCard>

      <FloatingCard className="right-0 top-[52%] w-52 sm:-right-4" delay={0.8}>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-800"><GraduationCap size={14} className="text-gold-600" /> Term 3 report card</p>
        <div className="mt-2 space-y-1.5">
          {[["Mathematics", 94, "EE"], ["English", 88, "EE"], ["Kiswahili", 72, "ME"]].map(([area, score, level]) => (
            <div key={area} className="flex items-center gap-2 text-[11px]">
              <span className="flex-1 text-brand-600">{area}</span>
              <span className="font-mono text-brand-800">{score}</span>
              <span className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold ${level === "EE" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}>{level}</span>
            </div>
          ))}
        </div>
      </FloatingCard>

      <FloatingCard className="bottom-2 left-[46%] w-48" delay={1.1}>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 size={16} /></span>
          <div>
            <p className="text-xs font-semibold text-brand-800">KES 5,000 received</p>
            <p className="font-mono text-[10px] text-brand-400">M-Pesa · SJK4T7Q2PA</p>
          </div>
        </div>
      </FloatingCard>

      <FloatingCard className="-top-3 right-0 hidden w-40 sm:block" delay={1.3}>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700"><TrendingUp size={13} /> Up 17% this year</p>
        <svg viewBox="0 0 120 32" className="mt-1.5 h-8 w-full" aria-hidden="true">
          <polyline points="0,28 18,24 36,20 54,21 72,15 90,12 108,9 120,5" fill="none" stroke="#1E3A6B" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </FloatingCard>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <header className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-5 md:px-8">
        <img src="/logo.png" alt="Success Academy crest" className="h-12 w-12 object-contain mix-blend-multiply" />
        <div className="leading-tight">
          <p className="font-headline text-xl font-bold uppercase tracking-wide text-brand-800">Success Academy</p>
          <p className="text-xs text-brand-500">Kitengela · Parent Portal</p>
        </div>
        <nav className="ml-auto hidden items-center gap-6 text-sm font-semibold text-brand-600 md:flex">
          <a href="#day" className="hover:text-brand-900">A school day</a>
          <a href="#everyone" className="hover:text-brand-900">Who it&apos;s for</a>
          <a href="#life" className="hover:text-brand-900">School life</a>
        </nav>
        <Link to="/login" className="btn-primary ml-auto md:ml-4">Sign in</Link>
      </header>

      <section className="relative">
        <div className="absolute inset-x-0 top-0 -z-10 h-full bg-[radial-gradient(ellipse_at_top_right,_#FBF0D6_0%,_transparent_55%),radial-gradient(ellipse_at_bottom_left,_#E1EAF5_0%,_transparent_60%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-6 md:grid-cols-2 md:px-8 md:pb-24 md:pt-12">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700 ring-1 ring-brand-100">
              <ShieldCheck size={15} className="text-gold-600" /> For Success Academy families
            </p>
            <h1 className="mt-5 font-headline text-6xl font-extrabold uppercase leading-[0.9] text-brand-800 sm:text-7xl lg:text-8xl">
              School, right in your pocket
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-brand-600">
              Report cards, the bus, homework, clubs and fees for your child at Success Academy Kitengela. On any phone, with SMS for the important bits.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login" className="btn-gold px-7 py-3.5 text-base shadow-lg shadow-gold-500/30">Open the parent portal</Link>
              <a href="#day" className="btn-ghost px-7 py-3.5 text-base">See how it works</a>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-brand-100 pt-6">
              <div><dt className="text-xs text-brand-400">Classes</dt><dd className="font-headline text-2xl font-bold text-brand-800">PG–Grade 9</dd></div>
              <div><dt className="text-xs text-brand-400">Curriculum</dt><dd className="font-headline text-2xl font-bold text-brand-800">CBC</dd></div>
              <div><dt className="text-xs text-brand-400">Works on</dt><dd className="font-headline text-2xl font-bold text-brand-800">Any phone</dd></div>
            </dl>
          </div>
          <HeroCollage />
        </div>
        <div className="uniform-check h-4" />
      </section>

      <section id="day" className="bg-brand-900 py-20 text-white">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <p className="font-headline text-xl font-bold text-gold-400">#InPursuitOfExcellence</p>
          <h2 className="mt-2 max-w-2xl font-headline text-5xl font-extrabold uppercase leading-[0.95] md:text-6xl">One school day, as a parent sees it</h2>
          <ol className="mt-12 grid gap-4 md:grid-cols-5">
            {DAY.map(({ time, icon: Icon, title, text, tone }) => (
              <li key={time} className="relative rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10">
                <p className="font-mono text-sm text-gold-400">{time}</p>
                <span className={`mt-4 flex h-10 w-10 items-center justify-center rounded-full ${tone}`}><Icon size={18} /></span>
                <h3 className="mt-4 font-semibold leading-snug">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-200">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="everyone" className="mx-auto max-w-6xl px-4 py-20 md:px-8">
        <h2 className="max-w-2xl font-headline text-5xl font-extrabold uppercase leading-[0.95] text-brand-800 md:text-6xl">Built for everyone at Success Academy</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {ROLES.map((role) => (
            <article key={role.title} className="overflow-hidden rounded-3xl bg-brand-50 ring-1 ring-brand-100">
              <img src={role.photo} alt="" className="h-44 w-full object-cover" />
              <div className="p-6">
                <h3 className="font-headline text-3xl font-extrabold uppercase text-brand-800">{role.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {role.points.map((point) => (
                    <li key={point} className="flex gap-2.5 text-sm text-brand-700">
                      <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-gold-600" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="grid items-center gap-10 overflow-hidden rounded-[2rem] bg-gradient-to-br from-gold-100 to-white p-8 ring-1 ring-gold-400/30 md:grid-cols-2 md:p-12">
          <div>
            <h2 className="font-headline text-5xl font-extrabold uppercase leading-[0.95] text-brand-800">No more waiting for the end-of-term report</h2>
            <p className="mt-4 text-brand-600">Marks arrive the day the teacher enters them, with CBC levels, competencies, values and comments. Parents see the whole year at a glance and know which learning areas need support.</p>
            <Link to="/login" className="btn-primary mt-6">See a sample report</Link>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-xl ring-1 ring-brand-100">
            <div className="flex items-center gap-3 border-b border-brand-100 pb-3">
              <img src="/logo.png" alt="" className="h-10 w-10 object-contain mix-blend-multiply" />
              <div>
                <p className="font-headline text-lg font-bold uppercase leading-none text-brand-800">Ethan Mutiso · Grade 4</p>
                <p className="text-xs text-brand-400">Term 3 2026 · Mid-Term</p>
              </div>
              <span className="ml-auto rounded-full bg-emerald-100 px-2.5 py-1 font-mono text-xs font-semibold text-emerald-700">81% EE</span>
            </div>
            <svg viewBox="0 0 300 90" className="mt-4 w-full" aria-label="Mean mark rising across the year from 64 to 81 percent">
              {[20, 45, 70].map((y) => <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="#E1EAF5" />)}
              <polyline points="5,62 45,56 85,47 125,47 165,40 205,36 245,37 295,30" fill="none" stroke="#1E3A6B" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
              {[[5, 62], [45, 56], [85, 47], [125, 47], [165, 40], [205, 36], [245, 37], [295, 30]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="4" fill="#DDA22E" stroke="#1E3A6B" strokeWidth="1.5" />)}
            </svg>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {[["Mathematics", "+7", true], ["Science and Technology", "+13", true], ["English", "+5", true], ["Creative Arts", "-3", false]].map(([area, change, up]) => (
                <div key={area} className="flex items-center justify-between rounded-lg bg-brand-50 px-2.5 py-1.5">
                  <span className="text-brand-700">{area}</span>
                  <span className={`font-mono font-semibold ${up ? "text-emerald-600" : "text-red-600"}`}>{change}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="life" className="mx-auto max-w-6xl px-4 py-20 md:px-8">
        <div className="flex flex-wrap items-end gap-4">
          <h2 className="flex-1 font-headline text-5xl font-extrabold uppercase leading-[0.95] text-brand-800 md:text-6xl">Life at Success Academy</h2>
          <p className="max-w-sm text-sm text-brand-500">Mixed day and boarding school on Prison Road, Kitengela. Boarding from Grade 4, transport around Kitengela.</p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {GALLERY.map((item, index) => (
            <figure key={item.title} className={`group relative overflow-hidden rounded-3xl ${index % 2 ? "md:mt-10" : ""}`}>
              <img src={item.photo} alt={item.title} className="aspect-[3/4] w-full object-cover transition duration-500 group-hover:scale-105" />
              <figcaption className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brand-800 backdrop-blur">{item.title}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-brand-800">
        <div className="uniform-check absolute inset-0 opacity-[0.12]" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 md:flex-row md:items-center md:px-8">
          <div className="flex-1">
            <h2 className="font-headline text-4xl font-extrabold uppercase leading-none text-white md:text-5xl">Ready to see your child&apos;s day?</h2>
            <p className="mt-3 text-brand-200">Your login is sent by the school office. Lost it? Call the secretary on 0748 065 956.</p>
          </div>
          <Link to="/login" className="btn-gold px-8 py-4 text-base"><BellRing size={18} /> Sign in to the portal</Link>
        </div>
      </section>

      <footer className="bg-brand-900 text-brand-200">
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
          <div className="text-sm md:text-right">
            <a href="https://successacademykitengela.com" className="font-semibold text-white hover:underline">successacademykitengela.com</a>
            <p className="mt-1">© {new Date().getFullYear()} Success Academy Kitengela</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
