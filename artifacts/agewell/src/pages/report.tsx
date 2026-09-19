import { useGetAgewellPatient } from '@workspace/api-client-react';
import { useParams } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Printer, Activity, HeartPulse } from 'lucide-react';
import { getLevelColor } from '@/lib/utils';
import { LineChart, Line, ResponsiveContainer, ReferenceLine } from 'recharts';
import { QueryError } from '@/components/ui/query-error';

export default function ReportScreen() {
  const params = useParams();
  const id = params.id || '';
  const { data: patient, isLoading, isError, error, refetch } = useGetAgewellPatient(id);

  if (isError) return <QueryError error={error} refetch={refetch} />;

  if (isLoading || !patient) return <div className="p-8 text-center text-slate-500">Loading report...</div>;

  const { care_plan, report, logs, cases, assessments } = patient;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl bg-white dark:bg-slate-950 min-h-screen pb-32 transition-colors">
      {/* Non-printable actions */}
      <div className="flex justify-end mb-6 print:hidden">
        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors">
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>

      <div className="print-area">
        {/* Header */}
        <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-6 mb-8 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded bg-slate-900 dark:bg-slate-100 flex items-center justify-center">
                <div className="w-3 h-3 bg-white dark:bg-slate-900 rounded-sm" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-slate-100">AgeWell</span>
            </div>
            <h1 className="text-3xl font-serif text-slate-900 dark:text-slate-100">7-Day Recovery Report</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Generated for Follow-up Clinician</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-1">Patient</div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{care_plan.patient.name}</div>
            <div className="text-slate-600 dark:text-slate-400">{care_plan.patient.age}y</div>
          </div>
        </div>

        {!report.available && (
          <Badge variant="secondary" className="mb-4 bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700/50">
            INTERIM REPORT — Monitoring Active
          </Badge>
        )}

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-center col-span-1 md:col-span-1">
            <div className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">Monitored</div>
            <div className="text-2xl font-bold dark:text-slate-100">{report.days_monitored} / 7</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-center col-span-1 md:col-span-1">
            <div className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">Adherence</div>
            <div className="text-2xl font-bold dark:text-slate-100">{report.medication_adherence_pct}%</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-center col-span-2 md:col-span-1">
            <div className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">Interventions</div>
            <div className="text-2xl font-bold dark:text-slate-100">{report.human_interventions}</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-center col-span-2 md:col-span-1">
            <div className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">Yellow Alerts</div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">{report.events?.YELLOW || 0}</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-center col-span-2 md:col-span-1">
            <div className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">Orange Alerts</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-500">{report.events?.ORANGE || 0}</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-center col-span-2 md:col-span-1">
            <div className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">Red Alerts</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-500">{report.events?.RED || 0}</div>
          </div>
        </div>

        {/* Trajectory Strip */}
        <div className="mb-10">
          <h2 className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-3">7-Day Trajectory</h2>
          <div className="flex gap-1 h-12 rounded-lg overflow-hidden">
            {logs.map((log, i) => {
              const dayLevel = assessments?.find(a => a.day === log.day)?.level || 'GREEN';
              const color = getLevelColor(dayLevel);
              return (
                <div key={i} className={`flex-1 ${color} flex flex-col justify-end p-1`}>
                  <div className="text-[10px] font-bold text-white/90 drop-shadow-md">D{log.day}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Summary */}
        <div className="mb-10">
          <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-slate-100 mb-2 border-b border-slate-200 dark:border-slate-800 pb-2">Clinical Trajectory Summary</h2>
          <p className="text-slate-800 dark:text-slate-300 leading-relaxed">
            {report.trajectory || "Summary not yet available."}
          </p>
        </div>

        {/* Vital Trends */}
        <div className="mb-10">
          <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-2"><Activity className="w-5 h-5"/> Key Vital Trends</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {report.vital_trends.map((trend, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-32 h-16 shrink-0 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800 p-1 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={logs}>
                      {trend.baseline != null && <ReferenceLine y={trend.baseline} stroke="#cbd5e1" strokeDasharray="3 3" />}
                      <Line type="monotone" dataKey={trend.vital} stroke="#0f172a" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm capitalize">{trend.vital.replace('_', ' ')}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Discharge: {trend.baseline ?? '--'}</div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    Latest: {trend.latest ?? '--'} 
                    {trend.direction && <span className="uppercase text-[10px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded ml-1 font-bold">{trend.direction}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Symptoms Log */}
        <div className="mb-10">
          <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-2">Reported Symptoms</h2>
          {report.symptom_log.length > 0 ? (
            <div className="space-y-3">
              {report.symptom_log.map((sl, i) => (
                <div key={i} className="flex gap-4">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-16">Day {sl.day}</div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-300">{sl.symptoms.join(', ')}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 dark:text-slate-400 italic text-sm">No symptoms reported.</div>
          )}
        </div>

        {/* Interventions */}
        <div className="mb-10">
          <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-2"><HeartPulse className="w-5 h-5"/> What We Caught</h2>
          {report.cases.length > 0 ? (
            <div className="space-y-4">
              {report.cases.map((c, i) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{c.headline}</div>
                    <Badge variant="outline" className={`border-0 ${getLevelColor(c.level)} text-white`}>{c.level}</Badge>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Opened Day {c.day} • Handled by: {c.who_should_act}</div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Resolution: <span className="font-normal">{c.state}</span></div>
                  {c.events && c.events.length > 0 && (
                     <ul className="text-xs text-slate-600 dark:text-slate-400 mt-3 space-y-1 bg-white dark:bg-slate-950 p-2 rounded border border-slate-100 dark:border-slate-800">
                       {c.events.map((e, ei) => (
                         <li key={ei}><span className="font-medium">[{new Date(e.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}] {e.actor}:</span> {e.note}</li>
                       ))}
                     </ul>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 dark:text-slate-400 italic">No significant deviations or interventions required during monitoring period.</div>
          )}
        </div>

        {/* Follow up */}
        <div className="mb-10">
          <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Follow-up Status</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {report.follow_up.map((f, i) => (
                <tr key={i}>
                  <td className="py-3 font-semibold dark:text-slate-200">{f.provider}</td>
                  <td className="py-3 text-slate-600 dark:text-slate-400">{f.specialty}</td>
                  <td className="py-3 text-slate-600 dark:text-slate-400">{f.due_date}</td>
                  <td className="py-3 font-medium text-right text-slate-900 dark:text-slate-100">{f.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          .print-area { max-width: 100%; padding: 0; }
          @page { margin: 1cm; }
        }
      `}</style>
    </div>
  );
}