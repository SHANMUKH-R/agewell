import { Link } from 'wouter';
import { useAccessibility } from '@/lib/accessibility';
import { Type, Eye, Volume2, Square, Users } from 'lucide-react';

export function AccessibilityBar({ readText }: { readText: string }) {
  const {
    textScale,
    cycleTextScale,
    colorblind,
    setColorblind,
    speak,
    stop,
    speaking,
    ttsSupported,
  } = useAccessibility();

  const scaleLabel =
    textScale === 'base' ? 'A' : textScale === 'large' ? 'A+' : 'A++';

  return (
    <div className="w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-colors duration-500">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
        <span className="text-sm sm:text-base font-semibold text-slate-500 dark:text-slate-400 mr-1">
          Comfort
        </span>

        <button
          type="button"
          onClick={cycleTextScale}
          aria-label={`Text size: ${scaleLabel}. Tap to change.`}
          className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-base font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 hover:border-slate-300 dark:hover:bg-slate-700 dark:hover:border-slate-600 transition-all duration-300 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Type className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="tabular-nums">{scaleLabel}</span>
        </button>

        <button
          type="button"
          onClick={() => setColorblind(!colorblind)}
          aria-pressed={colorblind}
          aria-label="Toggle colorblind-friendly colors"
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-base font-bold transition-all duration-300 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
            colorblind
              ? 'border-primary/50 bg-primary/10 text-primary'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 hover:border-slate-300 dark:hover:bg-slate-700 dark:hover:border-slate-600'
          }`}
        >
          <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Colors</span>
        </button>

        {ttsSupported && (
          <button
            type="button"
            onClick={() => (speaking ? stop() : speak(readText))}
            aria-label={speaking ? 'Stop reading' : 'Read this screen aloud'}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-base font-bold transition-all duration-300 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              speaking
                ? 'border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 hover:border-slate-300 dark:hover:bg-slate-700 dark:hover:border-slate-600'
            }`}
          >
            {speaking ? (
              <>
                <Square className="w-4 h-4 sm:w-5 sm:h-5" /> Stop
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> Read aloud
              </>
            )}
          </button>
        )}

        <Link
          href="/welcome"
          className="ml-auto flex items-center gap-2 rounded-full px-3 py-2 text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          Switch user
        </Link>
      </div>
    </div>
  );
}
