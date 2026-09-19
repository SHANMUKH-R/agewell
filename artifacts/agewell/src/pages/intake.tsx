import { useState, useRef } from 'react';
import { useGetAgewellIntakeSample, getGetAgewellIntakeSampleQueryKey, useExtractAgewellIntake, useConfirmAgewellIntake } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, HeartPulse, Pill, CheckCircle2, User, Upload } from 'lucide-react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { QueryError } from '@/components/ui/query-error';

export default function IntakeScreen() {
  const [text, setText] = useState('');
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const { refetch: loadSample, isFetching: isLoadingSample, isError: isSampleError, error: sampleError } = useGetAgewellIntakeSample({
    query: { enabled: false, queryKey: getGetAgewellIntakeSampleQueryKey() }
  });
  
  const extractMutation = useExtractAgewellIntake({
    mutation: {
      onError: (err: any) => {
        toast({ title: 'Extraction failed', description: err.message || 'Unknown error', variant: 'destructive' });
      }
    }
  });

  const confirmMutation = useConfirmAgewellIntake({
    mutation: {
      onError: (err: any) => {
        toast({ title: 'Confirmation failed', description: err.message || 'Unknown error', variant: 'destructive' });
      }
    }
  });

  if (isSampleError) return <QueryError error={sampleError} refetch={loadSample} />;

  const handleLoadSample = async () => {
    const res = await loadSample();
    if (res.data) setText(res.data.text);
  };

  const handleExtract = () => {
    if (!text.trim()) return;
    extractMutation.mutate({ data: { text } });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setText('');
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      extractMutation.mutate({ data: { file_base64: base64, filename: file.name } });
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirm = () => {
    if (!extractMutation.data?.care_plan) return;
    confirmMutation.mutate(
      { data: { care_plan: extractMutation.data.care_plan } },
      {
        onSuccess: (patient) => {
          setLocation(`/patients/${patient.id}`);
        }
      }
    );
  };

  const plan = extractMutation.data?.care_plan;
  const isExtracting = extractMutation.isPending;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">New Patient Intake</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Provide a discharge summary to automatically generate a 7-day monitoring plan.</p>
      </div>

      {!plan ? (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm relative bg-white dark:bg-slate-900">
          {isExtracting && (
            <div className="absolute inset-0 z-10 bg-white/50 dark:bg-slate-900/50 flex flex-col items-center justify-center rounded-xl backdrop-blur-[1px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <div className="font-semibold text-slate-700 dark:text-slate-300">Extracting care plan...</div>
            </div>
          )}
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Discharge Summary</label>
              <div className="flex flex-wrap md:flex-nowrap gap-2 w-full md:w-auto">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 w-full md:w-auto border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoadingSample || isExtracting}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload .txt / .pdf
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".txt,.pdf"
                  onChange={handleFileUpload}
                />
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-primary h-9 w-full md:w-auto bg-primary/5 hover:bg-primary/10 dark:hover:bg-primary/20"
                  onClick={handleLoadSample}
                  disabled={isLoadingSample || isExtracting}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Load Margaret's Sample
                </Button>
              </div>
            </div>
            
            <Textarea 
              className="min-h-[300px] font-mono text-sm leading-relaxed p-4 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              placeholder="Paste raw hospital discharge summary here, or upload a file above..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isExtracting}
            />
            
            <div className="mt-6 flex justify-end">
              <Button 
                onClick={handleExtract} 
                disabled={!text.trim() || isExtracting}
                size="lg"
                className="px-8 text-white"
              >
                <BrainIcon className="w-5 h-5 mr-2" />
                Extract Care Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-300">Care Plan Extracted Successfully</h3>
                <p className="text-emerald-700 dark:text-emerald-500 text-sm">Please review the structured data before starting monitoring.</p>
              </div>
            </div>
            <Button 
              size="lg" 
              onClick={handleConfirm}
              disabled={confirmMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 w-full md:w-auto"
            >
              {confirmMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Confirm & Start 7-Day Monitoring
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <CardTitle className="text-base flex items-center gap-2 dark:text-slate-200"><User className="w-4 h-4 text-slate-500"/> Patient Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{plan.patient.name}</div>
                  <div className="text-slate-600 dark:text-slate-400">{plan.patient.age}y • Primary: <span className="font-semibold text-slate-900 dark:text-slate-200">{plan.primary_condition}</span></div>
                </div>
                
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Discharge Diagnoses</div>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 list-disc pl-4 space-y-1">
                    {plan.discharge_diagnoses.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <CardTitle className="text-base flex items-center gap-2 dark:text-slate-200"><HeartPulse className="w-4 h-4 text-slate-500"/> Baseline & Monitoring</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    ['Weight', plan.discharge_baseline.weight_lb, 'lb'],
                    ['Systolic BP', plan.discharge_baseline.bp_systolic, 'mmHg'],
                    ['Diastolic BP', plan.discharge_baseline.bp_diastolic, 'mmHg'],
                    ['Heart rate', plan.discharge_baseline.heart_rate, 'bpm'],
                    ['SpO₂', plan.discharge_baseline.spo2, '%'],
                    ['Temperature', plan.discharge_baseline.temp_f, '°F'],
                    ['Glucose', plan.discharge_baseline.glucose, 'mg/dL'],
                  ].map(([label, value, unit]) => (
                    <div key={String(label)} className="bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700">
                      <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">{label}</div>
                      <div className="font-mono font-medium dark:text-slate-200">{value ?? '--'} {value != null ? unit : ''}</div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Monitoring Instructions</div>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                    {plan.monitoring_instructions.map((instruction, i) => (
                      <li key={i} className="rounded border border-slate-100 dark:border-slate-700 p-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{instruction.what}</span>
                        {instruction.frequency ? ` — ${instruction.frequency}` : ''}
                        {instruction.threshold_text ? <div className="text-xs mt-1">{instruction.threshold_text}</div> : null}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Red Flag Symptoms</div>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.red_flag_symptoms.map(s => (
                      <Badge key={s} variant="destructive" className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <CardTitle className="text-base dark:text-slate-200">Follow-up Appointments</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {plan.follow_up.map((appointment, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{appointment.specialty}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">{appointment.provider}</div>
                    <div className="text-sm font-mono mt-1 text-slate-800 dark:text-slate-200">{appointment.due_date}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="md:col-span-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <CardTitle className="text-base flex items-center gap-2 dark:text-slate-200"><Pill className="w-4 h-4 text-slate-500"/> Medications</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-3">Medication</th>
                        <th className="px-4 py-3">Dose</th>
                        <th className="px-4 py-3">Frequency</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {plan.medications.map((m, i) => (
                        <tr key={i} className={m.changed_at_discharge ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}>
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-200">{m.name}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{m.dose}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{m.frequency}</td>
                          <td className="px-4 py-3">
                            {m.changed_at_discharge ? (
                              <Badge className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700 text-[10px] uppercase font-bold tracking-wider">
                                Changed at Discharge
                              </Badge>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 text-xs">Unchanged</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 pb-8">
            <Button variant="outline" onClick={() => extractMutation.reset()} className="dark:bg-slate-900 dark:text-white dark:border-slate-700">Cancel</Button>
            <Button onClick={handleConfirm} disabled={confirmMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Confirm & Start Monitoring
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function BrainIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
      <path d="M6 18a4 4 0 0 1-1.967-.516" />
      <path d="M19.967 17.484A4 4 0 0 1 18 18" />
    </svg>
  );
}
