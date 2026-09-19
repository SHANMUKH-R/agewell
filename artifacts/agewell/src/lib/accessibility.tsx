import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

/**
 * Per-person accessibility profile for the Elder experience.
 *
 * The profile is deliberately client-side and persisted to localStorage so a
 * shared device (e.g. a kitchen tablet) remembers the last person who used it.
 */

export type TextScale = 'base' | 'large' | 'xl';

// Provided for backward compatibility for anything expecting a numerical zoom factor
const ZOOM: Record<TextScale, number> = {
  base: 1,
  large: 1.15,
  xl: 1.3,
};

type AccessibilityValue = {
  textScale: TextScale;
  setTextScale: (scale: TextScale) => void;
  cycleTextScale: () => void;
  /** Numeric zoom factor for the current text scale (legacy). */
  zoom: number;
  colorblind: boolean;
  setColorblind: (on: boolean) => void;
  /** Read a string aloud using the browser's speech synthesis. */
  speak: (text: string) => void;
  stop: () => void;
  speaking: boolean;
  ttsSupported: boolean;
};

const AccessibilityContext = createContext<AccessibilityValue | null>(null);

const TEXT_KEY = 'agewell-text-scale';
const PALETTE_KEY = 'agewell-palette';

function readStored<T extends string>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return (v as T) || fallback;
  } catch {
    return fallback;
  }
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [textScale, setTextScaleState] = useState<TextScale>(() =>
    readStored<TextScale>(TEXT_KEY, 'base'),
  );
  const [colorblind, setColorblindState] = useState<boolean>(
    () => readStored<string>(PALETTE_KEY, 'default') === 'cb',
  );
  const [speaking, setSpeaking] = useState(false);

  const ttsSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  const setTextScale = useCallback((scale: TextScale) => {
    setTextScaleState(scale);
    try {
      localStorage.setItem(TEXT_KEY, scale);
    } catch {
      /* private mode / storage disabled — ignore */
    }
  }, []);

  const cycleTextScale = useCallback(() => {
    setTextScaleState((prev) => {
      const next: TextScale =
        prev === 'base' ? 'large' : prev === 'large' ? 'xl' : 'base';
      try {
        localStorage.setItem(TEXT_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const setColorblind = useCallback((on: boolean) => {
    setColorblindState(on);
    try {
      localStorage.setItem(PALETTE_KEY, on ? 'cb' : 'default');
    } catch {
      /* ignore */
    }
  }, []);

  // Reflect the palette choice and font scale on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (colorblind) root.setAttribute('data-palette', 'cb');
    else root.removeAttribute('data-palette');

    // Scale rem values for the whole application globally based on text scale
    // This achieves the zoom requirement organically across layouts without using CSS zoom
    // We use percentages so we respect the user's browser default font size settings.
    if (textScale === 'base') root.style.fontSize = '100%';
    else if (textScale === 'large') root.style.fontSize = '112.5%';
    else if (textScale === 'xl') root.style.fontSize = '125%';
  }, [colorblind, textScale]);

  const stop = useCallback(() => {
    if (!ttsSupported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [ttsSupported]);

  const speak = useCallback(
    (text: string) => {
      if (!ttsSupported || !text) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95; // slightly slower — easier for older listeners
      u.pitch = 1;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(u);
    },
    [ttsSupported],
  );

  // Stop any narration if the component tree unmounts.
  useEffect(() => () => {
    if (ttsSupported) window.speechSynthesis.cancel();
  }, [ttsSupported]);

  return (
    <AccessibilityContext.Provider
      value={{
        textScale,
        setTextScale,
        cycleTextScale,
        zoom: ZOOM[textScale],
        colorblind,
        setColorblind,
        speak,
        stop,
        speaking,
        ttsSupported,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error(
      'useAccessibility must be used within an AccessibilityProvider',
    );
  }
  return ctx;
}
