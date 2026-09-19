import { Link } from 'wouter';
import { useAccessibility } from '@/lib/accessibility';
import { Type, Eye, Volume2, Square, Users } from 'lucide-react';

/**
 * Always-visible accessibility controls for the Elder screen.
 *
 * Three levers, each one tap:
 *   - Text size   (base -> large -> extra large -> base)
 *   - Colorblind palette (toggles a colorblind-safe severity ramp)
 *   - Read aloud  (speaks the provided text via the browser)
 *
 * `readText` is whatever the current view wants narrated. When speech is
 * unsupported the read-aloud button is hidden rather than shown broken.
 */
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
    <div className="w-full border-b-2 border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <div className="max-w-2xl mx-auto px-6 py-3 flex flex-wrap items-center gap-3">
        <span className="text-base font-semibold text-slate-500 dark:text-slate-400 mr-1">
          Comfort
        </span>

        <button
          type="button"
          onClick={cycleTextScale}
          aria-label={`Text size: ${scaleLabel}. Tap to change.`}
          className="flex items-center gap-2 rounded-full border-2 border-slate-300 dark:border-slate-700 px-4 py-2 text-lg font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Type className="w-5 h-5" />
          <span className="tabular-nums">{scaleLabel}</span>
        </button>

        <button
          type="button"
          onClick={() => setColorblind(!colorblind)}
          aria-pressed={colorblind}
          aria-label="Toggle colorblind-friendly colors"
          className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 text-lg font-bold transition-colors ${
            colorblind
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Eye className="w-5 h-5" />
          <span>Colors</span>
        </button>

        {ttsSupported && (
          <button
            type="button"
            onClick={() => (speaking ? stop() : speak(readText))}
            aria-label={speaking ? 'Stop reading' : 'Read this screen aloud'}
            className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 text-lg font-bold transition-colors ${
              speaking
                ? 'border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
                : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {speaking ? (
              <>
                <Square className="w-5 h-5" /> Stop
              </>
            ) : (
              <>
                <Volume2 className="w-5 h-5" /> Read aloud
              </>
            )}
          </button>
        )}

        <Link
          href="/welcome"
          className="ml-auto flex items-center gap-2 rounded-full px-4 py-2 text-lg font-semibold text-slate-500 dark:text-slate-400 hover:text-primary transition-colors"
        >
          <Users className="w-5 h-5" />
          Switch user
        </Link>
      </div>
    </div>
  );
}
