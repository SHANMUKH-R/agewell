import { useGetAgewellState, useGetAgewellPatient } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getLevelColor } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { QueryError } from '@/components/ui/query-error';

export default function FamilyView() {
  const { data: state } = useGetAgewellState();
  const id = state?.selected_patient_id || 'margaret';
  const { data: patient, isLoading, isError, error, refetch } = useGetAgewellPatient(id);

  if (isError) return <QueryError error={error} refetch={refetch} />;

  if (isLoading || !patient) return <div className="p-8 text-center text-slate-500">Loading family view...</div>;

  const { care_plan, current_assessment, summary, day, logs, cases, assessments } = patient;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 font-sans transition-colors">
      <div className="bg-white dark:bg-slate-900 px-4 md:px-8 py-6 border-b border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{care_plan.patient.name} — Day {day} of 7</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{new Date().toLocaleDateString()}</p>
        </div>
        <div className="flex gap-1">
          {Array.from({length: 7}).map((_, i) => {
            const isPast = i < day;
            const isToday = i === day - 1;
            const dayAssessment = assessments.find(a => a.day === i + 1);
            const color = !isPast
              ? 'bg-slate-200 dark:bg-slate-700'
              : getLevelColor(dayAssessment?.level ?? 'GREEN');
            return (
              <div key={i} className={`w-3 h-3 md:w-4 md:h-4 rounded-full ${color} ${isToday ? 'ring-2 ring-offset-2 ring-primary dark:ring-offset-slate-900' : ''}`} />
            );
          })}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-8">
        
        {/* What Changed Today */}
        <div className={`p-6 rounded-xl border-l-4 shadow-sm bg-white dark:bg-slate-900 ${
          current_assessment.level === 'GREEN' ? 'border-l-emerald-500' : 
          current_assessment.level === 'YELLOW' ? 'border-l-amber-500' : 
          current_assessment.level === 'ORANGE' ? 'border-l-orange-500' : 'border-l-red-500'
        }`}>
          <h2 className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-2">What changed today</h2>
          <p className="text-lg md:text-xl font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
            {summary.patient_summary}
          </p>
        </div>

        {/* Adherence summary */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm dark:text-slate-200">Medication Adherence</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col justify-center">
            <div className="space-y-4">
              {care_plan.medications.slice(0,4).map((med, idx) => {
                const takenCount = logs.filter(l => l.meds_taken.some(m => m.med_name === med.name && m.taken)).length;
                const pct = Math.round((takenCount / day) * 100) || 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium dark:text-slate-300">
                      <span className="truncate pr-2">{med.name}</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 dark:bg-emerald-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Trend Charts - Grouped by 2 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm text-slate-700 dark:text-slate-300">Weight Trend (lbs)</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={logs} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="day" tickFormatter={(v) => `D${v}`} style={{ fontSize: 10 }} />
                  <YAxis domain={['auto', 'auto']} style={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: '12px' }} />
                  {care_plan.discharge_baseline.weight_lb != null && (
                    <ReferenceLine y={care_plan.discharge_baseline.weight_lb} stroke="#94a3b8" strokeDasharray="3 3" />
                  )}
                  <Line type="monotone" dataKey="weight_lb" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm text-slate-700 dark:text-slate-300">Heart Rate (bpm)</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={logs} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="day" tickFormatter={(v) => `D${v}`} style={{ fontSize: 10 }} />
                  <YAxis domain={['auto', 'auto']} style={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: '12px' }} />
                  {care_plan.discharge_baseline.heart_rate != null && (
                    <ReferenceLine y={care_plan.discharge_baseline.heart_rate} stroke="#94a3b8" strokeDasharray="3 3" />
                  )}
                  <Line type="monotone" dataKey="heart_rate" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm text-slate-700 dark:text-slate-300">Blood Pressure</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={logs} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="day" tickFormatter={(v) => `D${v}`} style={{ fontSize: 10 }} />
                  <YAxis domain={['auto', 'auto']} style={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: '12px' }} />
                  {care_plan.discharge_baseline.bp_systolic != null && (
                    <ReferenceLine y={care_plan.discharge_baseline.bp_systolic} stroke="#94a3b8" strokeDasharray="3 3" />
                  )}
                  {care_plan.discharge_baseline.bp_diastolic != null && (
                    <ReferenceLine y={care_plan.discharge_baseline.bp_diastolic} stroke="#94a3b8" strokeDasharray="3 3" />
                  )}
                  <Line type="monotone" dataKey="bp_systolic" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} name="Systolic" />
                  <Line type="monotone" dataKey="bp_diastolic" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} name="Diastolic" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm text-slate-700 dark:text-slate-300">Oxygen (SpO2 %)</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={logs} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="day" tickFormatter={(v) => `D${v}`} style={{ fontSize: 10 }} />
                  <YAxis domain={[85, 100]} style={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: '12px' }} />
                  {care_plan.discharge_baseline.spo2 != null && (
                    <ReferenceLine y={care_plan.discharge_baseline.spo2} stroke="#94a3b8" strokeDasharray="3 3" />
                  )}
                  <Line type="monotone" dataKey="spo2" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Active Cases */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm dark:text-slate-200">Care Team Activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {cases.length > 0 ? (
              <div className="space-y-4">
                {cases.map((c, i) => (
                  <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 gap-3">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100 text-sm mb-1">{c.headline}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Opened Day {c.day} • Status: {c.state}</div>
                    </div>
                    <div className="shrink-0 text-xs font-medium px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-600 dark:text-slate-300">
                      Handler: {c.who_should_act}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">No care team interventions required so far.</div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
