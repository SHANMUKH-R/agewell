import { useGetAgewellState, useGetAgewellPatient } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getLevelColor } from '@/lib/utils';
import { QueryError } from '@/components/ui/query-error';
import { OverallHealth, VitalsGrid } from '@/components/HealthVisuals';
import { getMedicationAdherence } from '@/lib/health-data';
import { Phone, Pill, UserRound } from 'lucide-react';

export default function FamilyView() {
  const { data: state } = useGetAgewellState();
  const id = state?.selected_patient_id || 'margaret';
  const { data: patient, isLoading, isError, error, refetch } = useGetAgewellPatient(id);

  if (isError) return <QueryError error={error} refetch={refetch} />;
  if (isLoading || !patient) return <div className="p-8 text-center text-slate-500">Loading family view...</div>;

  const { care_plan, current_assessment, summary, day, logs, cases, assessments, protocol } = patient;
  const caregiver = care_plan.caregiver;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:px-8">
        <div>
          <h1 className="text-2xl font-bold">{care_plan.patient.name} — Day {day} of 7</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Family view · current patient follows the shared demo selection</p>
        </div>
        <div className="flex gap-1" aria-label="Seven-day health trajectory">
          {Array.from({ length: 7 }).map((_, index) => {
            const dayAssessment = assessments.find((assessment) => assessment.day === index + 1);
            return (
              <div
                key={index}
                title={`Day ${index + 1}: ${dayAssessment?.level || 'No record'}`}
                className={`h-3 w-3 rounded-full md:h-4 md:w-4 ${index < day ? getLevelColor(dayAssessment?.level ?? 'GREEN') : 'bg-slate-200 dark:bg-slate-700'} ${index === day - 1 ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-900' : ''}`}
              />
            );
          })}
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 md:px-8">
        <div className={`rounded-xl border-l-4 bg-white p-6 shadow-sm dark:bg-slate-900 ${
          current_assessment.level === 'GREEN' ? 'border-l-emerald-500' :
          current_assessment.level === 'YELLOW' ? 'border-l-amber-500' :
          current_assessment.level === 'ORANGE' ? 'border-l-orange-500' : 'border-l-red-500'
        }`}>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">What changed today</h2>
          <p className="text-lg font-medium leading-relaxed md:text-xl">{summary.patient_summary}</p>
        </div>

        <OverallHealth logs={logs} assessments={assessments} currentDay={day} />

        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="border-b border-slate-100 pb-2 dark:border-slate-800">
            <CardTitle className="flex items-center gap-2 text-base"><Pill className="h-4 w-4 text-slate-500" /> Medication adherence this week</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {care_plan.medications.map((medication) => {
              const adherence = getMedicationAdherence(medication, logs, day);
              return (
                <div key={medication.name} className="space-y-1">
                  <div className="flex justify-between gap-3 text-sm font-medium">
                    <span className="truncate">{medication.name}</span>
                    <span>{adherence.isAsNeeded ? 'As needed' : adherence.percentage == null ? 'No record' : `${adherence.percentage}%`}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${adherence.percentage ?? 0}%` }} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {adherence.isAsNeeded ? 'Not included in scheduled adherence' : `${adherence.taken} taken · ${adherence.missed} missed · ${adherence.unknown} no record`}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="border-b border-slate-100 pb-2 dark:border-slate-800">
            <CardTitle className="flex items-center gap-2 text-base"><UserRound className="h-4 w-4 text-slate-500" /> Caregiver contact</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="font-semibold">{caregiver.name} <span className="font-normal text-slate-500">({caregiver.relation})</span></p>
            {caregiver.phone ? (
              <a href={`tel:${caregiver.phone}`} className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-white" aria-label={`Call ${caregiver.name}, ${caregiver.relation}`}>
                <Phone className="h-4 w-4" /> Call {caregiver.name} ({caregiver.relation})
              </a>
            ) : (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Phone not available for this caregiver.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="border-b border-slate-100 pb-2 dark:border-slate-800">
            <CardTitle className="text-base">Vitals and discharge baseline</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <VitalsGrid logs={logs} carePlan={care_plan} protocol={protocol} />
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="border-b border-slate-100 pb-2 dark:border-slate-800">
            <CardTitle className="text-base">Care team activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {cases.length > 0 ? (
              <div className="space-y-4">
                {cases.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="flex flex-col justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800 md:flex-row md:items-center">
                    <div>
                      <div className="mb-1 font-medium">{item.headline}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Opened Day {item.day} · Status: {item.state}</div>
                    </div>
                    <div className="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">Handler: {item.who_should_act}</div>
                  </div>
                ))}
              </div>
            ) : <div className="py-8 text-center text-sm text-slate-500">No care team interventions required so far.</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}