import { Link } from 'wouter';
import { ArrowRight, HeartPulse, ShieldCheck, Users, Stethoscope } from 'lucide-react';

const destinations = [
  {
    href: '/elder',
    label: 'Elder',
    description: 'A calm, accessible daily check-in.',
    icon: HeartPulse,
    className: 'border-amber-200/60 bg-amber-50/70 text-amber-950 hover:border-amber-300 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100',
  },
  {
    href: '/family',
    label: 'Family',
    description: 'See how your loved one is doing today.',
    icon: Users,
    className: 'border-teal-200/60 bg-teal-50/70 text-teal-950 hover:border-teal-300 dark:border-teal-900/50 dark:bg-teal-950/20 dark:text-teal-100',
  },
  {
    href: '/clinician',
    label: 'Clinician',
    description: 'Find the people who need attention now.',
    icon: Stethoscope,
    className: 'border-indigo-200/60 bg-indigo-50/70 text-indigo-950 hover:border-indigo-300 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-100',
  },
];

export default function Landing() {
  return (
    <div className="min-h-[calc(100dvh-64px)] overflow-hidden bg-[radial-gradient(circle_at_top_right,_hsl(40_90%_90%/.6),_transparent_50%),linear-gradient(135deg,_hsl(var(--background)),_hsl(35_40%_96%))] px-5 py-10 transition-colors duration-700 dark:bg-[radial-gradient(circle_at_top_right,_hsl(30_35%_25%/.4),_transparent_50%),linear-gradient(135deg,_hsl(var(--background)),_hsl(25_28%_12%))] sm:px-8 sm:py-16 flex items-center">
      <div className="mx-auto max-w-6xl w-full">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_.9fr]">
          <section className="max-w-3xl">
            <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-primary/10 bg-white/60 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-primary shadow-sm backdrop-blur-sm dark:bg-slate-900/60 dark:border-slate-700">
              <span className="h-2 w-2 rounded-full bg-severity-green animate-pulse" aria-hidden="true" />
              Context-aware recovery support
            </div>
            <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight text-slate-900 dark:text-white sm:text-7xl lg:text-[5rem]">
              A clearer signal for the days after care.
            </h1>
            <p className="mt-8 max-w-2xl text-2xl font-medium leading-[1.6] text-slate-600 dark:text-slate-300 sm:text-3xl">
              We don't give you more data. We tell you who needs help now, and why.
              <span className="mt-3 block font-bold text-primary dark:text-primary/90">Context over thresholds.</span>
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/welcome"
                className="inline-flex min-h-[3.5rem] items-center justify-center gap-3 rounded-2xl bg-primary px-8 py-4 text-xl font-bold text-primary-foreground shadow-lg shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
              >
                Start demo <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#views"
                className="inline-flex min-h-[3.5rem] items-center justify-center rounded-2xl border border-slate-200 bg-white/50 px-8 py-4 text-xl font-bold text-slate-700 transition-all duration-300 hover:bg-white hover:shadow-md dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
              >
                Choose a view
              </a>
            </div>
          </section>

          <aside className="relative rounded-[2.5rem] border border-white/60 bg-white/60 p-8 shadow-2xl shadow-slate-900/5 backdrop-blur-md transition-all duration-500 dark:border-slate-700/50 dark:bg-slate-900/60 sm:p-10">
            <ShieldCheck className="h-14 w-14 text-teal-600 dark:text-teal-400" />
            <h2 className="mt-6 text-3xl font-bold text-slate-900 dark:text-white tracking-tight">A human signal, not another dashboard.</h2>
            <p className="mt-5 text-xl leading-relaxed text-slate-600 dark:text-slate-300">
              AgeWell brings readings, symptoms, medications, and the person’s baseline together so the right human can review what matters.
            </p>
            <div className="mt-8 border-t border-slate-200/60 pt-7 dark:border-slate-700/60">
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">Built for a shared screen</p>
              <p className="mt-2 text-base text-slate-600 dark:text-slate-400 leading-relaxed">Large type, clear actions, and accessible color signals for every role.</p>
            </div>
          </aside>
        </div>

        <section id="views" className="mt-24 scroll-mt-20">
          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary/80 dark:text-primary/70">Explore AgeWell</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white tracking-tight sm:text-4xl">One recovery story, three useful views.</h2>
            </div>
            <p className="max-w-md text-lg font-medium text-slate-600 dark:text-slate-400 leading-relaxed">Use the persona picker to set comfortable text size and color settings before entering the demo.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {destinations.map(({ href, label, description, icon: Icon, className }) => (
              <Link
                key={href}
                href={href}
                className={`group rounded-3xl border p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 ${className}`}
              >
                <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 p-4 inline-block mb-6 shadow-sm">
                  <Icon className="h-8 w-8 opacity-80" aria-hidden="true" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight">{label}</h3>
                <p className="mt-3 text-lg leading-relaxed opacity-90 font-medium">{description}</p>
                <span className="mt-8 inline-flex items-center gap-2 text-base font-bold tracking-wide">
                  Open view <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
