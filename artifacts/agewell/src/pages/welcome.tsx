import { useLocation } from 'wouter';
import { useAccessibility, type TextScale } from '@/lib/accessibility';
import { Heart, Eye, Glasses, Stethoscope, Users } from 'lucide-react';

/**
 * "Who's using this?" — the shared-device entry point.
 *
 * On a kitchen tablet, whoever walks up taps their tile and the app adapts to
 * them: text size, colorblind-safe colors, and which view opens. Real presence
 * detection (camera/biosensor) is on the roadmap; this picker is the honest,
 * demoable stand-in for it and doubles as an accessible manual switch.
 */

type Persona = {
  id: string;
  name: string;
  blurb: string;
  icon: typeof Heart;
  accent: string;
  textScale: TextScale;
  colorblind: boolean;
  to: string;
};

const PERSONAS: Persona[] = [
  {
    id: 'margaret',
    name: 'Margaret',
    blurb: 'Standard view',
    icon: Heart,
    accent: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400',
    textScale: 'base',
    colorblind: false,
    to: '/elder',
  },
  {
    id: 'arthur',
    name: 'Arthur',
    blurb: 'I have trouble seeing',
    icon: Eye,
    accent: 'text-sky-700 bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400',
    textScale: 'xl',
    colorblind: false,
    to: '/elder',
  },
  {
    id: 'ravi',
    name: 'Ravi',
    blurb: "I'm colorblind",
    icon: Glasses,
    accent:
      'text-violet-700 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400',
    textScale: 'large',
    colorblind: true,
    to: '/elder',
  },
];

const HELPERS: Persona[] = [
  {
    id: 'family',
    name: 'Family',
    blurb: 'Check on my parent',
    icon: Users,
    accent:
      'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
    textScale: 'base',
    colorblind: false,
    to: '/family',
  },
  {
    id: 'clinician',
    name: 'Care team',
    blurb: 'Clinician command center',
    icon: Stethoscope,
    accent:
      'text-indigo-700 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400',
    textScale: 'base',
    colorblind: false,
    to: '/',
  },
];

export default function Welcome() {
  const [, setLocation] = useLocation();
  const { setTextScale, setColorblind } = useAccessibility();

  const choose = (p: Persona) => {
    setTextScale(p.textScale);
    setColorblind(p.colorblind);
    setLocation(p.to);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 text-center">
          Who's using AgeWell?
        </h1>
        <p className="text-xl text-slate-500 dark:text-slate-400 text-center mt-3 mb-10">
          Tap your name. The screen will adjust to you.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {PERSONAS.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                onClick={() => choose(p)}
                className="flex flex-col items-center gap-4 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm hover:border-primary hover:shadow-md transition-all min-h-[220px] justify-center"
              >
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center ${p.accent}`}
                >
                  <Icon className="w-10 h-10" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {p.name}
                </div>
                <div className="text-lg text-slate-500 dark:text-slate-400 text-center font-medium">
                  {p.blurb}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 pt-8 border-t-2 border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {HELPERS.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                onClick={() => choose(p)}
                className="flex items-center gap-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:border-primary transition-all"
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${p.accent}`}
                >
                  <Icon className="w-7 h-7" />
                </div>
                <div className="text-left">
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {p.name}
                  </div>
                  <div className="text-base text-slate-500 dark:text-slate-400 font-medium">
                    {p.blurb}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
