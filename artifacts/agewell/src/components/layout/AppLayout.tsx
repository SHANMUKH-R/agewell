import { type ReactNode, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { DemoControls } from './DemoControls';
import { useTheme } from '@/components/theme-provider';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`h-9 w-9 rounded-full ${className}`}>
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all duration-500 dark:-rotate-90 dark:scale-0 text-slate-600 dark:text-slate-300" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all duration-500 dark:rotate-0 dark:scale-100 text-slate-600 dark:text-slate-300" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case '1': setLocation('/elder'); break;
        case '2': setLocation('/family'); break;
        case '3': setLocation('/clinician'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setLocation]);

  const isLanding = location === '/' || location === '/welcome';

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-50/50 dark:bg-slate-950 font-sans transition-colors duration-500">
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm print:bg-white print:border-none print:shadow-none transition-colors duration-500">
        <div className="container mx-auto px-4 flex flex-col md:flex-row min-h-[64px] py-3 items-center justify-between gap-3">
          <div className="flex flex-row items-center justify-between w-full md:w-auto">
            <Link href="/" className="font-bold text-xl text-primary tracking-tight flex items-center gap-2 print:text-black hover:opacity-80 transition-opacity">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center print:bg-black shadow-sm">
                <div className="w-3 h-3 bg-white rounded-sm" />
              </div>
              AgeWell
            </Link>
            <ThemeToggle className="md:hidden print:hidden" />
          </div>

          <nav className="flex items-center overflow-x-auto w-full md:w-auto justify-start sm:justify-center gap-2 sm:gap-6 text-sm font-medium print:hidden pb-1 md:pb-0 scrollbar-hide">
            <Link href="/elder" className={`transition-all duration-300 whitespace-nowrap px-4 py-2.5 rounded-full ${location === '/elder' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Elder</Link>
            <Link href="/family" className={`transition-all duration-300 whitespace-nowrap px-4 py-2.5 rounded-full ${location === '/family' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Family</Link>
            <Link href="/clinician" className={`transition-all duration-300 whitespace-nowrap px-4 py-2.5 rounded-full ${location === '/clinician' || location.startsWith('/patients/') ? 'bg-primary/10 text-primary font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Clinician</Link>
          </nav>

          <div className="flex items-center justify-end w-full md:w-auto gap-4 hidden md:flex print:hidden">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 pb-16 flex flex-col relative">
        {children}
      </main>

      <footer className="py-8 text-center text-sm font-medium text-slate-400 dark:text-slate-500 print:hidden transition-colors duration-500">
        Demo — fictional data
      </footer>

      {!isLanding && (
        <div className="print:hidden">
          <DemoControls />
        </div>
      )}
    </div>
  )
}
