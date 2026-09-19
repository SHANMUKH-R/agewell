import { Link } from 'wouter';
import { ArrowRight, HeartPulse, ShieldCheck, Users, Stethoscope } from 'lucide-react';

const destinations = [
  {
    href: '/elder',
    label: 'Elder',
    description: 'A calm, thumb-friendly daily check-in.',
    icon: HeartPulse,
    className: 'border-amber-200 bg-amber-50/80 text-amber-950 hover:border-amber-400 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100',
  },
  {
    href: '/family',
    label: 'Family',
    description: 'See how your loved one is doing today.',
    icon: Users,
    className: 'border-teal-200 bg-teal-50/80 text-teal-950 hover:border-teal-400 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-100',
  },
  {
    href: '/clinician',
    label: 'Clinician',
    description: 'Find the people who need attention now.',
    icon: Stethoscope,
    className: 'border-indigo-200 bg-indigo-50/80 text-indigo-950 hover:border-indigo-400 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-100',
  },
];

export default function Landing() {
  return (
    <div className="min-h-[calc(100dvh-64px)] overflow-hidden bg-[radial-gradient(circle_at_top_right,_hsl(40_90%_90%/.75),_transparent_40%),linear-gradient(135deg,_hsl(var(--background)),_hsl(35_45%_94%))] px-5 py-10 transition-colors dark:bg-[radial-gradient(circle_at_top_right,_hsl(30_35%_25%/.5),_transparent_42%),linear-gradient(135deg,_hsl(var(--background)),_hsl(25_28%_14%))] sm:px-8 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_.85fr]">
          <section className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/70 px-4 py-2 text-sm font-bold uppercase tracking-[0.16em] text-primary shadow-sm dark:bg-slate-900/70">
              <span className="h-2.5 w-2.5 rounded-full bg-severity-green" aria-hidden="true" />
              Context-aware recovery support
            </div>
            <h1 className="max-w-3xl text-5xl font-bold leading-[1.03] tracking-tight text-slate-950 dark:text-white sm:text-7xl">
              A clearer signal for the days after care.
            </h1>
            <p className="mt-7 max-w-2xl text-2xl font-medium leading-relaxed text-slate-700 dark:text-slate-200 sm:text-3xl">
              We don't give you more data. We tell you who needs help now, and why.
              <span className="mt-2 block font-bold text-primary">Context over thresholds.</span>
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/welcome"
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-primary px-7 py-4 text-xl font-bold text-primary-foreground shadow-lg shadow-primary/15 transition-all hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
              >
                Start demo <ArrowRight className="h-6 w-6" />
              </Link>
              <a
                href="#views"
                className="inline-flex min-h-14 items-center justify-center rounded-2xl border-2 border-primary/25 bg-white/65 px-7 py-4 text-xl font-bold text-primary transition-colors hover:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900"
              >
                Choose a view
              </a>
            </div>
          </section>

          <aside className="relative rounded-[2rem] border-2 border-white/80 bg-white/75 p-7 shadow-2xl shadow-slate-900/10 backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/75 sm:p-9">
            <div className="absolute -right-5 -top-5 rounded-2xl border-2 border-amber-200 bg-amber-100 px-4 py-3 text-sm font-bold text-amber-950 shadow-lg dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
              SYNTHETIC DATA
            </div>
            <ShieldCheck className="h-12 w-12 text-teal-700 dark:text-teal-300" />
            <h2 className="mt-6 text-3xl font-bold text-slate-950 dark:text-white">A human signal, not another dashboard.</h2>
            <p className="mt-4 text-xl leading-relaxed text-slate-600 dark:text-slate-300">
              AgeWell brings readings, symptoms, medications, and the person’s baseline together so the right human can review what matters.
            </p>
            <div className="mt-7 border-t-2 border-slate-200 pt-6 dark:border-slate-700">
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">Built for a shared screen</p>
              <p className="mt-1 text-base text-slate-600 dark:text-slate-400">Large type, clear actions, and accessible color signals for every role.</p>
            </div>
          </aside>
        </div>

        <section id="views" className="mt-16 scroll-mt-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Explore AgeWell</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">One recovery story, three useful views.</h2>
            </div>
            <p className="max-w-md text-base text-slate-600 dark:text-slate-400">Use the persona picker to set comfortable text size and color settings before entering the demo.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {destinations.map(({ href, label, description, icon: Icon, className }) => (
              <Link
                key={href}
                href={href}
                className={`group rounded-3xl border-2 p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 ${className}`}
              >
                <Icon className="h-9 w-9" aria-hidden="true" />
                <h3 className="mt-5 text-2xl font-bold">{label}</h3>
                <p className="mt-2 text-lg leading-relaxed opacity-80">{description}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-base font-bold">
                  Open view <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}