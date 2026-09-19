import { useGetAgewellState } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { getLevelColor } from '@/lib/utils';
import { ShieldAlert, AlertCircle, AlertTriangle, CheckCircle2, Search, PlusCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { QueryError } from '@/components/ui/query-error';

export default function ClinicianDashboard() {
  const { data: state, isLoading, isError, error, refetch } = useGetAgewellState();

  if (isError) return <QueryError error={error} refetch={refetch} />;

  if (isLoading || !state) {
    return (
      <div className="container mx-auto px-4 py-8 animate-pulse">
        <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl mb-8"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800/50 rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  const { counts, patients } = state;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Command Center</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">AgeWell doesn't give you more data. It tells you who needs you now, and why.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/intake" className="inline-block">
            <Button className="bg-primary hover:bg-primary/90 text-white">
              <PlusCircle className="w-4 h-4 mr-2" />
              New Intake
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <CountCard title="STABLE" count={counts.GREEN} icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />} colorClass="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20" />
        <CountCard title="MONITOR" count={counts.YELLOW} icon={<AlertCircle className="w-5 h-5 text-amber-500" />} colorClass="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20" />
        <CountCard title="REVIEW" count={counts.ORANGE} icon={<AlertTriangle className="w-5 h-5 text-orange-500" />} colorClass="border-orange-200 bg-orange-50/50 dark:border-orange-900/50 dark:bg-orange-950/20" />
        <CountCard title="URGENT" count={counts.RED} icon={<ShieldAlert className="w-5 h-5 text-red-500" />} colorClass="border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20" />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Active Monitoring ({patients.length})</h2>
        <div className="relative w-64 hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search patients..." className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800" />
        </div>
      </div>

      <div className="space-y-3">
        {patients.map((p) => (
          <Link key={p.id} href={`/patients/${p.id}`} className="block group">
            <Card className="overflow-hidden border-slate-200 dark:border-slate-800 hover:border-primary/30 dark:hover:border-primary/50 hover:shadow-md transition-all bg-white dark:bg-slate-900">
              <div className="flex flex-col md:flex-row">
                {/* Severity Stripe */}
                <div className={`w-full md:w-2 shrink-0 ${getLevelColor(p.level)} h-2 md:h-auto`}></div>
                
                <div className="p-4 md:p-5 flex-1 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                  <div className="w-full md:w-48 shrink-0">
                    <div className="font-semibold text-base text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                      {p.name}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{p.age}y</span>
                      <span>•</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{p.primary_condition}</span>
                    </div>
                  </div>
                  
                  <div className="w-full md:w-24 shrink-0 flex items-center gap-2">
                    <div className="text-xs font-medium px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                      Day {p.day}/7
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                      {p.headline}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-500 mt-1 line-clamp-1">
                      {p.diagnosis}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center justify-end w-full md:w-32">
                    {p.level !== 'GREEN' && (
                      <Badge variant="outline" className="font-medium border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                        <span className="text-slate-400 dark:text-slate-500 mr-1.5 text-xs">Action:</span>
                        {p.who_should_act}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
        {patients.length === 0 && (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400 border border-dashed rounded-xl border-slate-300 dark:border-slate-700">
            No patients currently monitored.
          </div>
        )}
      </div>
    </div>
  );
}

function CountCard({ title, count, icon, colorClass }: { title: string, count: number, icon: React.ReactNode, colorClass: string }) {
  return (
    <Card className={`overflow-hidden border ${colorClass} shadow-sm`}>
      <CardContent className="p-5 flex flex-col items-center justify-center text-center">
        <div className="mb-2">{icon}</div>
        <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">{count}</div>
        <div className="text-xs font-bold tracking-wider text-slate-600 dark:text-slate-400">{title}</div>
      </CardContent>
    </Card>
  );
}
