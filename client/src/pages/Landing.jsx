import { motion } from "framer-motion";
import { BookOpen, Bus, ClipboardCheck, GraduationCap, MessageSquare, Trophy } from "lucide-react";
import { Link } from "react-router-dom";

const FEATURES = [
  { icon: MessageSquare, title: "Notices by SMS", text: "Reach every parent instantly, by class, club, bus route or the whole school." },
  { icon: Trophy, title: "Clubs & Activities", text: "Athletics, music, swimming, agriculture and more, with reminders before each session." },
  { icon: ClipboardCheck, title: "Daily Attendance", text: "Teachers mark the register in seconds and parents see it the same day." },
  { icon: GraduationCap, title: "CBC Progress", text: "EE, ME, AE and BE levels for every subject, visible to parents all term." },
  { icon: BookOpen, title: "Homework", text: "Assignments and due dates posted by class teachers, straight to parents." },
  { icon: Bus, title: "Transport", text: "School bus routes on a live map, with delay alerts sent by SMS." },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-5 md:px-8">
        <img src="/logo.png" alt="Success Academy logo" className="h-12 w-12 object-contain mix-blend-multiply" />
        <div className="leading-tight">
          <p className="font-display font-bold text-brand-800">Success Academy</p>
          <p className="text-xs text-brand-500">Kitengela</p>
        </div>
        <Link to="/login" className="btn-primary ml-auto">
          Sign in
        </Link>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:px-8 md:py-20">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="badge bg-gold-100 text-gold-600">Parent & Teacher Portal</span>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-brand-800 md:text-5xl">
            Keeping every parent close to the classroom.
          </h1>
          <p className="mt-4 text-lg text-brand-600">
            Notices, clubs, attendance, homework and CBC progress for Success Academy Kitengela, from Playgroup to Grade 9.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/login" className="btn-primary px-6 py-3 text-base">
              Open the portal
            </Link>
            <a href="https://successacademykitengela.com" className="btn-ghost px-6 py-3 text-base">
              School website
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative mx-auto w-full max-w-sm"
        >
          <div className="absolute -inset-4 rounded-[2.5rem] bg-gold-400/30 blur-2xl" />
          <div className="relative rounded-[2.5rem] border-8 border-brand-800 bg-white p-5 shadow-2xl">
            <p className="text-center text-xs font-semibold text-brand-400">Messages · SUCCESSACAD</p>
            {[
              "Success Academy: Swimming this Thursday. Members should carry costumes and towels.",
              "Success Academy: Bus delay. The Kitengela Town bus will be 20 minutes late this evening.",
              "Success Academy: Sports Day is next Friday. Learners to come in house colours.",
            ].map((text, index) => (
              <motion.div
                key={text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.4 }}
                className="mt-3 rounded-2xl rounded-tl-sm bg-brand-50 p-3 text-sm text-brand-800"
              >
                {text}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="bg-brand-800 py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <h2 className="text-center text-3xl font-bold text-white">Everything parents ask about, in one place</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }, index) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="rounded-2xl bg-brand-700 p-6"
              >
                <Icon className="text-gold-400" size={28} />
                <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm text-brand-200">{text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-sm text-brand-400">
        © {new Date().getFullYear()} Success Academy Kitengela · In pursuit of excellence
      </footer>
    </div>
  );
}
