import { useState } from 'react';
import { useGetAgewellPatient, useTransitionAgewellCase, getGetAgewellPatientQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getLevelColor } from '@/lib/utils';
import { ArrowLeft, BrainCircuit, Activity, Pill, Clock, FileText, CheckCircle2, MessageCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { QueryError } from '@/components/ui/query-error';
import { OverallHealth, VitalsGrid } from '@/components/HealthVisuals';
import { getMedicationAdherence, getMedicationDosesPerDay, getMedicationInstruction } from '@/lib/health-data';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function PatientDetail() {
  const params = useParams();
  const id = params.id || '';
  const { data: patient, isLoading, isError, error, refetch } = useGetAgewellPatient(id);

  if (isError) return <QueryError error={error} refetch={refetch} />;

  if (isLoading || !patient) {
    return <div className="container mx-auto px-4 py-8 animate-pulse text-center text-slate-500">Loading patient data...</div>;
  }

  const { care_plan, current_assessment, protocol, logs, cases } = patient;
  const verificationLogs = logs.filter(l => l.med_verification?.checked);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <Link href="/clinician" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-primary mb-4 dark:text-slate-400 dark:hover:text-primary">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Command Center
        </Link>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{care_plan.patient.name}</h1>
              <Badge variant="outline" className="text-sm font-semibold border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                Day {patient.day}/7
              </Badge>
              <div className={`px-3 py-1 text-white font-bold text-sm rounded-full ${getLevelColor(current_assessment.level)}`}>
                {current_assessment.level}
              </div>
            </div>
            <div className="text-slate-600 dark:text-slate-400 flex items-center gap-2 mt-2">
              <span>{care_plan.patient.age}y</span>
              <span>•</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{care_plan.primary_condition}</span>
              <span>•</span>
              <span>Monitoring protocol: <span className="font-medium">{protocol.label}</span></span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/report/${id}`}>
              <Button variant="outline" className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200">
                <FileText className="w-4 h-4 mr-2" />
                Generate 7-Day Report
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 space-y-6">
          {/* AI REASON FOR ESCALATION */}
          <Card className="border-primary/20 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
            <div className={`h-1.5 w-full ${getLevelColor(current_assessment.level)}`} />
            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg dark:text-slate-200">AI Reason for Escalation</CardTitle>
              </div>
              {current_assessment.who_should_act !== 'patient' && current_assessment.level !== 'GREEN' && (
                <Badge variant="outline" className="bg-white dark:bg-slate-900">Action: {current_assessment.who_should_act}</Badge>
              )}
            </CardHeader>
            <CardContent className="pt-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">{current_assessment.headline}</h3>
              
              <ul className="space-y-3 mb-6 text-slate-700 dark:text-slate-300">
                {current_assessment.rationale.map((r, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-primary mr-2 mt-1">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>

              {current_assessment.deviation_from_plan && (
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-4">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Deviation from Plan</span>
                  <p className="text-sm text-slate-800 dark:text-slate-200">{current_assessment.deviation_from_plan}</p>
                </div>
              )}

              {current_assessment.triggered_hard_rules.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {current_assessment.triggered_hard_rules.map(rule => (
                    <Badge key={rule} variant="secondary" className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      {rule}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Medication Verification Evidence */}
          {verificationLogs.length > 0 && (
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <CardTitle className="text-base flex items-center gap-2 dark:text-slate-200">
                  <FileText className="w-4 h-4 text-slate-500" /> Recorded Medication Evidence
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {verificationLogs.map((l, i) => (
                  <div key={i} className={`p-3 rounded-lg border text-sm ${l.med_verification.mismatch ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">Day {l.day}: {l.med_verification.med_name}</span>
                      {l.med_verification.mismatch && <Badge variant="destructive" className="text-[10px]">Mismatch</Badge>}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <span className="text-xs text-slate-500 block">Bottle Label</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{l.med_verification.label_dose}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Discharge Plan Expected</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{l.med_verification.expected_dose || care_plan.medications.find(m => m.name === l.med_verification.med_name)?.dose}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <OverallHealth logs={logs} assessments={patient.assessments} currentDay={patient.day} />

          {/* Vitals Charts */}
          {false && (
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2 flex flex-row justify-between items-center border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base flex items-center gap-2 dark:text-slate-200">
                <Activity className="w-4 h-4 text-slate-500" /> Vitals Trending
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Weight Chart */}
                {protocol.vitals.includes('weight_lb') && (
                  <div className="h-48">
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Weight (lb)</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={logs} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="day" tickFormatter={(v) => `Day ${v}`} style={{ fontSize: 12 }} />
                        <YAxis domain={['auto', 'auto']} style={{ fontSize: 12 }} />
                        <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                        {care_plan.discharge_baseline.weight_lb != null && (
                          <ReferenceLine y={care_plan.discharge_baseline.weight_lb ?? undefined} stroke="#94a3b8" strokeDasharray="3 3" label={{ position: 'top', value: 'Baseline', fill: '#94a3b8', fontSize: 10 }} />
                        )}
                        <Line type="monotone" dataKey="weight_lb" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                
                {/* BP Chart */}
                {protocol.vitals.includes('bp_systolic') && (
                  <div className="h-48">
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Blood Pressure</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={logs} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="day" tickFormatter={(v) => `Day ${v}`} style={{ fontSize: 12 }} />
                        <YAxis domain={['auto', 'auto']} style={{ fontSize: 12 }} />
                        <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                        {care_plan.discharge_baseline.bp_systolic != null && (
                          <ReferenceLine y={care_plan.discharge_baseline.bp_systolic ?? undefined} stroke="#94a3b8" strokeDasharray="3 3" />
                        )}
                        {care_plan.discharge_baseline.bp_diastolic != null && (
                          <ReferenceLine y={care_plan.discharge_baseline.bp_diastolic ?? undefined} stroke="#94a3b8" strokeDasharray="3 3" />
                        )}
                        <Line type="monotone" dataKey="bp_systolic" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} />
                        <Line type="monotone" dataKey="bp_diastolic" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Heart Rate */}
                {protocol.vitals.includes('heart_rate') && (
                  <div className="h-48">
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Heart Rate (bpm)</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={logs} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="day" tickFormatter={(v) => `Day ${v}`} style={{ fontSize: 12 }} />
                        <YAxis domain={['auto', 'auto']} style={{ fontSize: 12 }} />
                        <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                        {care_plan.discharge_baseline.heart_rate != null && (
                          <ReferenceLine y={care_plan.discharge_baseline.heart_rate ?? undefined} stroke="#94a3b8" strokeDasharray="3 3" />
                        )}
                        <Line type="monotone" dataKey="heart_rate" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* SpO2 Chart */}
                {protocol.vitals.includes('spo2') && (
                  <div className="h-48">
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Oxygen (SpO2 %)</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={logs} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="day" tickFormatter={(v) => `Day ${v}`} style={{ fontSize: 12 }} />
                        <YAxis domain={[85, 100]} style={{ fontSize: 12 }} />
                        <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                        {care_plan.discharge_baseline.spo2 != null && (
                          <ReferenceLine y={care_plan.discharge_baseline.spo2 ?? undefined} stroke="#94a3b8" strokeDasharray="3 3" />
                        )}
                        <Line type="monotone" dataKey="spo2" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

              </div>
            </CardContent>
          </Card>
          )}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader className="border-b border-slate-100 pb-2 dark:border-slate-800">
              <CardTitle className="text-base flex items-center gap-2 dark:text-slate-200">
                <Activity className="w-4 h-4 text-slate-500" /> Vitals Trending
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <VitalsGrid logs={logs} carePlan={care_plan} protocol={protocol} />
            </CardContent>
          </Card>

          {/* Symptoms Timeline */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base flex items-center gap-2 dark:text-slate-200">
                <MessageCircle className="w-4 h-4 text-slate-500" /> Symptoms Log
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                {logs.slice().reverse().map(log => {
                  if (log.symptoms.length === 0) return null;
                  return (
                    <div key={log.day} className="flex items-start gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mt-0.5 w-12">
                        Day {log.day}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {log.symptoms.map(s => (
                          <Badge key={s} variant="secondary" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {logs.every(l => l.symptoms.length === 0) && (
                  <div className="text-sm text-slate-500 italic">No symptoms reported.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Medication Adherence */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base flex items-center gap-2 dark:text-slate-200">
                <Pill className="w-4 h-4 text-slate-500" /> Medication Adherence
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 p-0">
              <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
                  <TableRow className="border-slate-200 dark:border-slate-700">
                    <TableHead className="w-[40%] text-slate-500 dark:text-slate-400">Medication</TableHead>
                    {Array.from({length: patient.day}).map((_, i) => (
                      <TableHead key={i} className="text-center px-1 text-slate-500 dark:text-slate-400">D{i+1}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {care_plan.medications.map(med => (
                    <TableRow key={med.name} className="border-slate-100 dark:border-slate-800">
                      <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                        <div className="flex flex-col">
                          <span>{getMedicationInstruction(med, care_plan.medications.indexOf(med))} · {med.name}</span>
                          {med.changed_at_discharge && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-500 font-bold tracking-wider mt-0.5">CHANGED AT DISCHARGE</span>
                          )}
                        </div>
                      </TableCell>
                      {Array.from({length: patient.day}).map((_, i) => {
                        const dayLog = logs.find(l => l.day === i + 1);
                        const medicationRecords = dayLog?.meds_taken.filter(m => m.med_name === med.name) || [];
                        const takenRecord = medicationRecords[0];
                        const expectedDoses = getMedicationDosesPerDay(med.frequency);
                        const takenDoses = medicationRecords.filter(m => m.taken).length;
                        return (
                          <TableCell key={i} className="text-center px-1">
                            {getMedicationAdherence(med, logs, patient.day).isAsNeeded ? (
                              <span className="text-[10px] text-slate-400">As needed</span>
                            ) : expectedDoses > 1 && medicationRecords.length > 0 ? (
                              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{takenDoses}/{expectedDoses}</span>
                            ) : takenRecord?.taken ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mx-auto" />
                            ) : takenRecord ? (
                              <span className="text-[10px] font-bold text-red-500">Missed</span>
                            ) : (
                              <span className="text-[10px] text-slate-400">No record</span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                Weekly adherence:{' '}
                {care_plan.medications.map((med) => {
                  const result = getMedicationAdherence(med, logs, patient.day);
                  return `${med.name}: ${result.isAsNeeded ? 'As needed' : result.percentage == null ? 'No record' : `${result.percentage}% (${result.taken}/${result.scheduled})`}`;
                }).join(' · ')}
              </div>
            </CardContent>
          </Card>
          
        </div>

        <div className="space-y-6">
          {/* Active Cases / Closed Loop Tracker */}
          <CaseTracker cases={cases} patientId={id} />
        </div>
      </div>
    </div>
  );
}

// Case Tracker Component
function CaseTracker({ cases, patientId }: { cases: any[], patientId: string }) {
  const queryClient = useQueryClient();
  const [resolutionNote, setResolutionNote] = useState('');
  const { toast } = useToast();
  
  const transitionMutation = useTransitionAgewellCase({
    mutation: {
      onSuccess: (updatedPatient) => {
        setResolutionNote('');
        // The transition response is the authoritative case timeline. Write it
        // immediately so a background poll cannot briefly restore stale case data.
        queryClient.setQueryData(
          getGetAgewellPatientQueryKey(patientId),
          updatedPatient,
        );
        queryClient.invalidateQueries({ queryKey: getGetAgewellPatientQueryKey(patientId) });
      },
      onError: (err: any) => {
        toast({ title: 'Status update failed', description: err.message || 'Unknown error', variant: 'destructive' });
      }
    }
  });

  // The stage demo follows the newest detected gap. Older open cases remain
  // visible in the report, but resolving today's case must not jump the tracker
  // backward to an earlier day.
  const activeCase = cases[cases.length - 1];

  if (!activeCase) {
    return (
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base dark:text-slate-200">Closed-Loop Case Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-500 text-center py-6">No cases opened.</div>
        </CardContent>
      </Card>
    );
  }

  const states = ['DETECTED', 'NOTIFIED', 'ACKNOWLEDGED', 'ACTED', 'RESOLVED'];
  const currentStateIndex = states.indexOf(activeCase.state);

  const handleAdvance = (targetState: string, actor: string, isOverride: boolean = false) => {
    transitionMutation.mutate({
      id: activeCase.id,
      data: {
        state: targetState as any,
        actor: actor as any,
        note: isOverride ? resolutionNote || `Moved to ${targetState}` : `Moved to ${targetState} via demo controls`,
        clinician_expected: isOverride ? true : undefined,
        expected_state: activeCase.state,
      }
    });
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
      <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 pb-3">
        <CardTitle className="text-base flex items-center justify-between dark:text-slate-200">
          <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Case Tracker</span>
          <Badge variant="outline" className={`border-0 text-white ${getLevelColor(activeCase.level)}`}>
            {activeCase.level}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="relative pl-6 space-y-6">
          <div className="absolute top-2 bottom-2 left-2.5 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
          
          {states.map((state, index) => {
            const isCompleted = index <= currentStateIndex;
            const isCurrent = index === currentStateIndex;
            const event = activeCase.events.find((e: any) => e.state === state);
            
            return (
              <div key={state} className={`relative ${isCompleted ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`absolute -left-6 w-3 h-3 rounded-full mt-1.5 border-2 bg-white dark:bg-slate-900 ${
                  isCurrent ? 'border-primary shadow-[0_0_0_2px_rgba(2,132,199,0.2)] dark:shadow-[0_0_0_2px_rgba(2,132,199,0.4)]' : 
                  isCompleted ? 'border-primary bg-primary dark:bg-primary' : 'border-slate-300 dark:border-slate-600'
                }`} />
                
                <div className="flex flex-col">
                  <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {state}
                    {event && <span className="text-xs font-normal text-slate-500">{new Date(event.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                  </div>
                  {event && (
                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700 inline-block w-fit">
                      <span className="font-medium text-slate-800 dark:text-slate-100">{event.actor}:</span> {event.note}
                    </div>
                  )}
                  
                  {isCurrent && index < states.length - 1 && activeCase.resolution_check?.status !== 'ACTED_UNRESOLVED' && (
                    <div className="mt-3 flex gap-2">
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="h-7 text-xs bg-primary/10 text-primary hover:bg-primary/20"
                        onClick={() => handleAdvance(states[index + 1], activeCase.who_should_act)}
                        disabled={transitionMutation.isPending}
                      >
                        Advance to {states[index + 1]}
                      </Button>
                    </div>
                  )}
                  
                  {/* ACTED_UNRESOLVED display prompting for clinician expected note */}
                  {state === 'ACTED' && isCurrent && activeCase.resolution_check?.status === 'ACTED_UNRESOLVED' && (
                    <div className="mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs p-3 rounded-md">
                      <strong>Acknowledged is not resolved.</strong>
                      <div className="mt-1">{activeCase.resolution_check.reason}</div>
                      <div className="mt-1 mb-2 font-medium">Auto-recheck scheduled in {activeCase.resolution_check.next_check_hours} hours.</div>
                      
                      <div className="border-t border-amber-200/50 dark:border-amber-800/50 pt-3 mt-3">
                        <label className="font-semibold block mb-1">Clinician Override (Expected State)</label>
                        <Input 
                          placeholder="Note reason for override..." 
                          className="h-8 text-xs bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700 mb-2"
                          value={resolutionNote}
                          onChange={e => setResolutionNote(e.target.value)}
                        />
                        <Button 
                          size="sm" 
                          className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto"
                          onClick={() => handleAdvance('RESOLVED', 'physician', true)}
                          disabled={transitionMutation.isPending || !resolutionNote.trim()}
                        >
                          Resolve & Document Expected
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}