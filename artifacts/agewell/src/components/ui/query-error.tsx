import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent } from './card';

export function QueryError({ error, refetch }: { error: unknown, refetch: () => void }) {
  const message = error instanceof Error ? error.message : "An unexpected error occurred.";
  return (
    <div className="p-4 sm:p-8 flex items-center justify-center min-h-[50vh]">
      <Card className="w-full max-w-md border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50">
        <CardContent className="pt-6 flex flex-col items-center text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-red-900 dark:text-red-400 mb-2">Failed to load data</h3>
          <p className="text-sm text-red-700 dark:text-red-300 mb-6">{message}</p>
          <Button onClick={() => refetch()} variant="outline" className="bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700">
            <RefreshCw className="w-4 h-4 mr-2" /> Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
