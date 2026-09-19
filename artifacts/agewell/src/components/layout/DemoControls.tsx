import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useRunAgewellDemo, 
  useGetAgewellState, 
  getGetAgewellStateQueryKey
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, FastForward, RefreshCw, Play, Server, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

export function DemoControls() {
  const [isCollapsed, setIsCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 640,
  );
  const queryClient = useQueryClient();
  const { data: state } = useGetAgewellState();
  const [location, setLocation] = useLocation();
  const routePatientId = location.match(/^\/(?:patients|report)\/([^/]+)$/)?.[1];
  const patientId = routePatientId || state?.selected_patient_id;
  const aiMode = state?.ai_mode;
  const { toast } = useToast();
  
  const runDemo = useRunAgewellDemo({
    mutation: {
      onSuccess: (updatedState, variables) => {
        queryClient.setQueryData(getGetAgewellStateQueryKey(), updatedState);
        if (variables.data.action === 'load') setLocation('/patients/margaret');
        if (variables.data.action === 'reset') setLocation('/');
        // Invalidate all queries to refresh the entire UI
        queryClient.invalidateQueries({ queryKey: getGetAgewellStateQueryKey() });
        queryClient.invalidateQueries();
      },
      onError: (err: any) => {
        toast({ title: 'Demo action failed', description: err.message || 'Unknown error', variant: 'destructive' });
      }
    }
  });
  const selectPatient = runDemo.mutate;
  useEffect(() => {
    if (routePatientId) selectPatient({ data: { action: 'select', patient_id: routePatientId } });
  }, [routePatientId, selectPatient]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && (e.target.isContentEditable || e.target.closest('input, textarea, select, [role="slider"]'))) return;
      if (e.key === 'ArrowRight' && !e.repeat && !runDemo.isPending && patientId) {
        e.preventDefault();
        runDemo.mutate({ data: { action: 'advance', patient_id: patientId } });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [runDemo, patientId]);

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 bg-slate-900 text-slate-100 border-t border-slate-700 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] transition-transform duration-300",
      isCollapsed ? "translate-y-[calc(100%-40px)]" : "translate-y-0"
    )}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-10 border-b border-slate-800">
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1.5">
              {aiMode === 'live' ? (
                <><Server className="w-3 h-3 text-emerald-400" /> AI: live</>
              ) : (
                <><Database className="w-3 h-3 text-amber-400" /> AI: {aiMode ?? 'loading'}</>
              )}
            </span>
            <span className="text-slate-600">|</span>
            <span>Demo: {state?.patients.find(p => p.id === patientId)?.name ?? 'Loading'} (→ advances)</span>
          </div>
          <button 
            aria-label={isCollapsed ? 'Expand demo controls' : 'Collapse demo controls'}
            aria-expanded={!isCollapsed}
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-slate-200"
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 py-4">
          <Button 
            variant="secondary" 
            size="sm"
            className="bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700"
            onClick={() => runDemo.mutate({ data: { action: 'load' } })}
            disabled={runDemo.isPending}
          >
            <Play className="w-4 h-4 mr-2" />
            Load Margaret
          </Button>
          
          <Button 
            variant="default" 
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => runDemo.mutate({ data: { action: 'advance', patient_id: patientId } })}
            disabled={runDemo.isPending}
          >
            <StepForwardIcon className="w-4 h-4 mr-2" />
            Advance one day
          </Button>
          
          <Button 
            variant="secondary" 
            size="sm"
            className="bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700"
            onClick={() => runDemo.mutate({ data: { action: 'jump', patient_id: patientId } })}
            disabled={runDemo.isPending}
          >
            <FastForward className="w-4 h-4 mr-2" />
            Jump to day 7
          </Button>
          
          <div className="flex-1" />
          
          <Button 
            variant="outline" 
            size="sm"
            className="bg-transparent text-slate-400 border-slate-700 hover:bg-red-950/30 hover:text-red-400 hover:border-red-900"
            onClick={() => runDemo.mutate({ data: { action: 'reset' } })}
            disabled={runDemo.isPending}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset demo
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepForwardIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="5 4 15 12 5 20 5 4" />
      <line x1="19" x2="19" y1="5" y2="19" />
    </svg>
  )
}
