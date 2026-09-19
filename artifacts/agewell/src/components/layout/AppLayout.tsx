import { type ReactNode, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { DemoControls } from './DemoControls';
import { useTheme } from '@/components/theme-provider';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`h-8 w-8 ${className}`}>
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-slate-600 dark:text-slate-300" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-slate-600 dark:text-slate-300" />
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
        case '3': setLocation('/'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setLocation]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors">
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm print:bg-white print:border-none print:shadow-none transition-colors">
        <div className="container mx-auto px-4 flex flex-col md:flex-row min-h-[64px] py-3 items-center justify-between gap-3">
          <div className="flex flex-row items-center justify-between w-full md:w-auto">
            <Link href="/" className="font-bold text-xl text-primary tracking-tight flex items-center gap-2 print:text-black">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center print:bg-black">
                <div className="w-3 h-3 bg-white rounded-sm" />
              </div>
              AgeWell
            </Link>
            <ThemeToggle className="md:hidden print:hidden" />
          </div>
          
          <nav className="flex items-center overflow-x-auto w-full md:w-auto justify-start sm:justify-center gap-4 sm:gap-6 text-sm font-medium print:hidden pb-1 md:pb-0 scrollbar-hide">
            <Link href="/elder" className={`transition-colors whitespace-nowrap py-1 sm:py-2 border-b-2 ${location === '/elder' ? 'border-primary text-primary' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-primary'}`}>[ Elder ]</Link>
            <Link href="/family" className={`transition-colors whitespace-nowrap py-1 sm:py-2 border-b-2 ${location === '/family' ? 'border-primary text-primary' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-primary'}`}>[ Family ]</Link>
            <Link href="/" className={`transition-colors whitespace-nowrap py-1 sm:py-2 border-b-2 ${location === '/' || location.startsWith('/patients/') ? 'border-primary text-primary' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-primary'}`}>[ Clinician ]</Link>
          </nav>

          <div className="flex items-center justify-between w-full md:w-auto gap-4">
            <Badge variant="outline" className="w-full md:w-auto justify-center bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200 border-amber-300 dark:border-amber-700 font-semibold px-3 py-1 shadow-sm whitespace-nowrap print:border-black print:text-black print:bg-transparent print:w-auto">
              SYNTHETIC DATA — NOT REAL PATIENTS
            </Badge>
            <ThemeToggle className="hidden md:flex print:hidden" />
          </div>
        </div>
      </header>
      
      <main className="flex-1 pb-32">
        {children}
      </main>
      
      <div className="print:hidden">
        <DemoControls />
      </div>
    </div>
  )
}
