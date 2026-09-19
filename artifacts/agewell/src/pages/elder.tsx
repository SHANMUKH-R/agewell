import { useState } from 'react';
import { useGetAgewellState, useGetAgewellPatient, useUpdateAgewellLog, getGetAgewellPatientQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { getLevelColor } from '@/lib/utils';
import { Check, PhoneCall, Pill, Activity, SmilePlus, ArrowLeft, Utensils, ActivitySquare, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { QueryError } from '@/components/ui/query-error';

type ElderView = 'home' | 'recovery' | 'meds' | 'readings' | 'feelings';

export default function ElderApp() {
  const { data: state } = useGetAgewellState();
  const id = state?.selected_patient_id || 'margaret';
  const { data: patient, isLoading, isError, error, refetch } = useGetAgewellPatient(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const updateLog = useUpdateAgewellLog({
    mutation: {
      onSuccess: (updatedPatient) => {
        queryClient.setQueryData(getGetAgewellPatientQueryKey(id), updatedPatient);
        queryClient.invalidateQueries({ queryKey: getGetAgewellPatientQueryKey(id) });
      },
      onError: (err: any) => {
        toast({ title: 'Failed to save', description: err.message || 'Unknown error', variant: 'destructive' });
      }
    }
  });

  const [activeView, setActiveView] = useState<ElderView>('home');
  const [checkingMed, setCheckingMed] = useState<string | null>(null);
  const [bottleText, setBottleText] = useState('');

  if (isError) return <QueryError error={error} refetch={refetch} />;

  if (isLoading || !patient) return <div className="p-8 text-center text-xl font-medium">Loading...</div>;

  const { care_plan, logs, protocol, day, current_assessment } = patient;
  const currentLog = logs.find(l => l.day === day);
  const reportedSymptoms = currentLog?.symptoms || [];
  
  const handleMedTaken = (medName: string) => {
    const currentMeds = currentLog?.meds_taken || [];
    const isTaken = currentMeds.some(m => m.med_name === medName && m.taken);
    if (!isTaken) {
      updateLog.mutate({
        id,
        data: {
          fields: {
            meds_taken: [...currentMeds, { med_name: medName, taken: true, time: new Date().toISOString() }]
          }
        }
      });
    }
  };

  const handleVerifyMed = () => {
    if (!checkingMed || !bottleText) return;
    updateLog.mutate({
      id,
      data: {
        fields: {
          med_verification: {
            checked: true,
            med_name: checkingMed,
            label_dose: bottleText,
            expected_dose: "",
            mismatch: false
          }
        }
      },
    }, {
      onSuccess: (updatedPatient) => {
        const verification = updatedPatient.logs.find(l => l.day === updatedPatient.day)?.med_verification;
        if (verification?.mismatch) {
          toast({
            title: 'Thank you.',
            description: "We've flagged this for pharmacist review. This demo simulates the notification; no message was sent.",
          });
        } else {
          toast({ title: 'Bottle information saved', description: 'It matches the discharge record.' });
        }
        setCheckingMed(null);
        setBottleText('');
      },
    });
  };

  const handleToggleSymptom = (symptom: string) => {
    let newSymptoms = [...reportedSymptoms];
    
    if (symptom === 'none') {
      newSymptoms = [];
    } else {
      newSymptoms = newSymptoms.filter(s => s !== 'none');
      if (newSymptoms.includes(symptom)) {
        newSymptoms = newSymptoms.filter(s => s !== symptom);
      } else {
        newSymptoms.push(symptom);
      }
    }

    updateLog.mutate({ id, data: { fields: { symptoms: newSymptoms } } });
  };

  const SYMPTOM_OPTIONS = [
    { id: 'fatigue', label: 'Tired' },
    { id: 'dizziness on standing', label: 'Dizzy' },
    { id: 'short of breath climbing stairs', label: 'Short of breath' },
    { id: 'ankle swelling', label: 'Swelling in ankles' },
    { id: 'chest pain', label: 'Chest pain' },
  ];

  // Using 'any' type cast for transient new fields until types are generated
  const logFields = currentLog as any;
  const setField = (field: string, value: any) => {
    updateLog.mutate({ id, data: { fields: { [field]: value } } });
  };

  const totalMeds = care_plan.medications.length;
  const takenMeds = care_plan.medications.filter(med => currentLog?.meds_taken.some(m => m.med_name === med.name && m.taken)).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24 text-[20px] font-sans">
      <div className="bg-white dark:bg-slate-900 px-6 py-6 border-b border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-10 flex items-center justify-between">
        <div>
          {activeView !== 'home' && (
            <button 
              onClick={() => setActiveView('home')} 
              className="flex items-center gap-2 text-primary font-bold mb-2 text-[22px]"
            >
              <ArrowLeft className="w-6 h-6" /> Back
            </button>
          )}
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
            {activeView === 'home' ? `Good morning, ${care_plan.patient.name.split(' ')[0]}` :
             activeView === 'recovery' ? 'Your Recovery Today' :
             activeView === 'meds' ? "Today's Medications" :
             activeView === 'readings' ? "Today's Readings" :
             "How are you feeling?"}
          </h1>
          {activeView === 'home' && (
            <p className="text-xl text-slate-500 dark:text-slate-400 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} — Day {day} of 7</p>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        
        {activeView === 'home' && (
          <div className="space-y-6">
            <button 
              onClick={() => setActiveView('recovery')}
              className={`w-full p-8 rounded-3xl border-2 text-left transition-colors flex flex-col gap-4 shadow-sm ${
                current_assessment.level === 'RED' ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900' :
                current_assessment.level === 'ORANGE' ? 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900' :
                current_assessment.level === 'YELLOW' ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900' :
                'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full ${getLevelColor(current_assessment.level)} shrink-0`} />
                <span className="text-[26px] font-bold">
                  {current_assessment.level === 'GREEN' ? "On track" :
                   current_assessment.level === 'YELLOW' ? "We're keeping an eye on something" :
                   current_assessment.level === 'ORANGE' ? "Flagged for care-team review" :
                   "Please contact help"}
                </span>
              </div>
              <span className="text-[20px] font-medium text-slate-700 dark:text-slate-300">Tap to view your daily summary</span>
            </button>

            <button 
              onClick={() => setActiveView('meds')}
              className="w-full p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-left transition-colors flex items-center justify-between shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                  <Pill className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <div className="text-[26px] font-bold text-slate-900 dark:text-slate-100">Medications</div>
                  <div className="text-[20px] text-slate-500 dark:text-slate-400 font-medium">{takenMeds} of {totalMeds} taken today</div>
                </div>
              </div>
              {takenMeds === totalMeds && <CheckCircle2 className="w-8 h-8 text-emerald-500" />}
            </button>

            <button 
              onClick={() => setActiveView('readings')}
              className="w-full p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-left transition-colors flex items-center gap-4 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <div className="w-12 h-12 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center shrink-0">
                <Activity className="w-7 h-7 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <div className="text-[26px] font-bold text-slate-900 dark:text-slate-100">Readings</div>
                <div className="text-[20px] text-slate-500 dark:text-slate-400 font-medium">Log your daily vitals</div>
              </div>
            </button>

            <button 
              onClick={() => setActiveView('feelings')}
              className="w-full p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-left transition-colors flex items-center justify-between shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
                  <SmilePlus className="w-7 h-7 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <div className="text-[26px] font-bold text-slate-900 dark:text-slate-100">Symptoms</div>
                  <div className="text-[20px] text-slate-500 dark:text-slate-400 font-medium">How are you feeling?</div>
                </div>
              </div>
              {reportedSymptoms.length > 0 && (
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-1 rounded-full text-lg font-bold text-slate-600 dark:text-slate-300">
                  {reportedSymptoms.includes('none') ? 'None' : reportedSymptoms.length}
                </div>
              )}
            </button>
          </div>
        )}

        {activeView === 'recovery' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className={`rounded-3xl p-8 border-2 shadow-sm ${
              current_assessment.level === 'RED' ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900' :
              current_assessment.level === 'ORANGE' ? 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900' :
              current_assessment.level === 'YELLOW' ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900' :
              'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900'
            }`}>
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-10 h-10 rounded-full ${getLevelColor(current_assessment.level)} shrink-0`} />
                <p className="text-3xl font-bold">
                  {current_assessment.level === 'GREEN' ? "On track" :
                   current_assessment.level === 'YELLOW' ? "We're keeping an eye on something" :
                   current_assessment.level === 'ORANGE' ? "Flagged for care-team review" :
                   "Please contact help"}
                </p>
              </div>
              <p className="text-[24px] leading-relaxed text-slate-800 dark:text-slate-200 bg-white/70 dark:bg-slate-900/70 p-6 rounded-2xl font-medium shadow-sm">
                {patient.summary.patient_summary}
              </p>
              
              {current_assessment.level === 'RED' && (
                <a href="tel:911" className="mt-8 flex items-center justify-center gap-4 w-full bg-red-600 hover:bg-red-700 text-white py-6 rounded-2xl text-[28px] font-bold transition-colors shadow-md">
                  <PhoneCall className="w-8 h-8" />
                  Call 911 Now
                </a>
              )}
            </div>
            
            <Button onClick={() => setActiveView('home')} size="elder" className="w-full text-[24px] bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 h-[80px]">
              Back to Home
            </Button>
          </div>
        )}

        {activeView === 'meds' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {care_plan.medications.map(med => {
              const isTaken = currentLog?.meds_taken.some(m => m.med_name === med.name && m.taken);
              const isChecking = checkingMed === med.name;

              return (
                <div key={med.name} className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[28px] font-bold text-slate-900 dark:text-slate-100 leading-tight mb-1">{med.name}</div>
                      <div className="text-[24px] text-slate-600 dark:text-slate-400 font-medium">{med.dose} • {med.time_of_day || med.frequency}</div>
                    </div>
                  </div>
                  
                  {!isChecking ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Button 
                        size="elder"
                        variant={isTaken ? "outline" : "elder"}
                        className={isTaken ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 text-[24px] pointer-events-none" : "w-full text-[24px]"}
                        onClick={() => handleMedTaken(med.name)}
                        disabled={updateLog.isPending}
                      >
                        {isTaken ? <><Check className="w-8 h-8 mr-2" /> Taken</> : "Mark Taken"}
                      </Button>
                      <Button 
                        size="elder"
                        variant="elderOutline"
                        className="text-[24px] dark:border-slate-700 dark:text-slate-300"
                        onClick={() => setCheckingMed(med.name)}
                      >
                        Check Bottle
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-2xl border-2 border-amber-200 dark:border-amber-800">
                      <Label className="text-[24px] font-bold mb-4 block text-amber-900 dark:text-amber-300">What does your bottle say?</Label>
                      <Input 
                        className="text-[26px] p-6 h-20 mb-6 bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-700 font-bold text-center" 
                        placeholder="e.g. 50 mg"
                        value={bottleText}
                        onChange={e => setBottleText(e.target.value)}
                      />
                      <div className="flex gap-4">
                        <Button variant="elderOutline" className="flex-1 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-[24px]" onClick={() => setCheckingMed(null)}>Cancel</Button>
                        <Button variant="elder" className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-[24px]" onClick={handleVerifyMed} disabled={updateLog.isPending}>
                          {updateLog.isPending ? 'Saving…' : 'Submit'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            <Button onClick={() => setActiveView('home')} size="elder" className="w-full text-[24px] bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 h-[80px] mt-8">
              Back to Home
            </Button>
          </div>
        )}

        {activeView === 'readings' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            
            {protocol.vitals.includes('weight_lb') && (
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <Label className="text-[26px] font-bold mb-4 block">Weight (lbs)</Label>
                <Input 
                  type="number" 
                  className="text-[32px] p-6 h-24 text-center font-bold bg-slate-50 dark:bg-slate-950 border-2 dark:border-slate-800" 
                  placeholder="0.0"
                  defaultValue={currentLog?.weight_lb || ''}
                  onBlur={(e) => {
                    if (e.target.value) setField('weight_lb', parseFloat(e.target.value));
                  }}
                />
              </div>
            )}

            {/* Twice daily BP for Hypertension, otherwise standard */}
            {protocol.vitals.includes('bp_systolic') && care_plan.primary_condition !== 'HYPERTENSION' && (
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <Label className="text-[26px] font-bold mb-4 block">Blood Pressure</Label>
                <div className="flex items-center gap-4">
                  <Input 
                    type="number" 
                    className="text-[32px] p-6 h-24 text-center font-bold bg-slate-50 dark:bg-slate-950 border-2 dark:border-slate-800 flex-1" 
                    placeholder="120"
                    defaultValue={currentLog?.bp_systolic || ''}
                    onBlur={(e) => {
                      if (e.target.value) setField('bp_systolic', parseInt(e.target.value));
                    }}
                  />
                  <span className="text-4xl font-bold text-slate-400">/</span>
                  <Input 
                    type="number" 
                    className="text-[32px] p-6 h-24 text-center font-bold bg-slate-50 dark:bg-slate-950 border-2 dark:border-slate-800 flex-1" 
                    placeholder="80"
                    defaultValue={currentLog?.bp_diastolic || ''}
                    onBlur={(e) => {
                      if (e.target.value) setField('bp_diastolic', parseInt(e.target.value));
                    }}
                  />
                </div>
              </div>
            )}

            {care_plan.primary_condition === 'HYPERTENSION' && (
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-8">
                <div>
                  <Label className="text-[26px] font-bold mb-4 block">Morning Blood Pressure</Label>
                  <div className="flex items-center gap-4">
                    <Input 
                      type="number" 
                      className="text-[32px] p-6 h-24 text-center font-bold bg-slate-50 dark:bg-slate-950 border-2 dark:border-slate-800 flex-1" 
                      placeholder="120"
                      defaultValue={currentLog?.bp_systolic || ''}
                      onBlur={(e) => {
                        if (e.target.value) setField('bp_systolic', parseInt(e.target.value));
                      }}
                    />
                    <span className="text-4xl font-bold text-slate-400">/</span>
                    <Input 
                      type="number" 
                      className="text-[32px] p-6 h-24 text-center font-bold bg-slate-50 dark:bg-slate-950 border-2 dark:border-slate-800 flex-1" 
                      placeholder="80"
                      defaultValue={currentLog?.bp_diastolic || ''}
                      onBlur={(e) => {
                        if (e.target.value) setField('bp_diastolic', parseInt(e.target.value));
                      }}
                    />
                  </div>
                </div>
                <div className="border-t-2 border-slate-100 dark:border-slate-800 pt-6">
                  <Label className="text-[26px] font-bold mb-4 block">Evening Blood Pressure</Label>
                  <div className="flex items-center gap-4">
                    <Input 
                      type="number" 
                      className="text-[32px] p-6 h-24 text-center font-bold bg-slate-50 dark:bg-slate-950 border-2 dark:border-slate-800 flex-1" 
                      placeholder="120"
                      defaultValue={logFields?.bp_evening_systolic || ''}
                      onBlur={(e) => {
                        if (e.target.value) setField('bp_evening_systolic', parseInt(e.target.value));
                      }}
                    />
                    <span className="text-4xl font-bold text-slate-400">/</span>
                    <Input 
                      type="number" 
                      className="text-[32px] p-6 h-24 text-center font-bold bg-slate-50 dark:bg-slate-950 border-2 dark:border-slate-800 flex-1" 
                      placeholder="80"
                      defaultValue={logFields?.bp_evening_diastolic || ''}
                      onBlur={(e) => {
                        if (e.target.value) setField('bp_evening_diastolic', parseInt(e.target.value));
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {protocol.vitals.includes('heart_rate') && (
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <Label className="text-[26px] font-bold mb-4 block">Heart Rate (bpm)</Label>
                <Input 
                  type="number" 
                  className="text-[32px] p-6 h-24 text-center font-bold bg-slate-50 dark:bg-slate-950 border-2 dark:border-slate-800" 
                  placeholder="70"
                  defaultValue={currentLog?.heart_rate || ''}
                  onBlur={(e) => {
                    if (e.target.value) setField('heart_rate', parseInt(e.target.value));
                  }}
                />
              </div>
            )}

            {protocol.vitals.includes('spo2') && (
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <Label className="text-[26px] font-bold mb-4 block">Oxygen (SpO2 %)</Label>
                <Input 
                  type="number" 
                  className="text-[32px] p-6 h-24 text-center font-bold bg-slate-50 dark:bg-slate-950 border-2 dark:border-slate-800" 
                  placeholder="98"
                  defaultValue={currentLog?.spo2 || ''}
                  onBlur={(e) => {
                    if (e.target.value) setField('spo2', parseInt(e.target.value));
                  }}
                />
              </div>
            )}

            {protocol.vitals.includes('glucose') && (
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <Label className="text-[26px] font-bold mb-4 block">Glucose (mg/dL)</Label>
                <Input 
                  type="number" 
                  className="text-[32px] p-6 h-24 text-center font-bold bg-slate-50 dark:bg-slate-950 border-2 dark:border-slate-800" 
                  placeholder="100"
                  defaultValue={currentLog?.glucose || ''}
                  onBlur={(e) => {
                    if (e.target.value) setField('glucose', parseInt(e.target.value));
                  }}
                />
              </div>
            )}

            {/* Condition Specific Additional Fields */}
            {care_plan.primary_condition === 'DIABETES' && (
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <Label className="text-[26px] font-bold mb-4 block flex items-center gap-2">
                  <Utensils className="w-7 h-7" /> Meals Note
                </Label>
                <Input 
                  className="text-[24px] p-6 h-24 font-medium bg-slate-50 dark:bg-slate-950 border-2 dark:border-slate-800" 
                  placeholder="e.g. Skipped breakfast, large lunch"
                  defaultValue={logFields?.meal_note || ''}
                  onBlur={(e) => setField('meal_note', e.target.value)}
                />
              </div>
            )}

            {care_plan.primary_condition === 'COPD' && (
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <Label className="text-[26px] font-bold mb-4 block flex items-center gap-2">
                  <ActivitySquare className="w-7 h-7" /> Activity Tolerance
                </Label>
                <Input 
                  className="text-[24px] p-6 h-24 font-medium bg-slate-50 dark:bg-slate-950 border-2 dark:border-slate-800" 
                  placeholder="e.g. Could walk to mailbox"
                  defaultValue={logFields?.activity_tolerance || ''}
                  onBlur={(e) => setField('activity_tolerance', e.target.value)}
                />
              </div>
            )}

            {care_plan.primary_condition === 'POST_OP' && (
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
                <div>
                  <Label className="text-[26px] font-bold mb-4 block flex items-center gap-2">
                    <ShieldAlert className="w-7 h-7" /> Wound Check
                  </Label>
                  <Input 
                    className="text-[24px] p-6 h-24 font-medium bg-slate-50 dark:bg-slate-950 border-2 dark:border-slate-800" 
                    placeholder="e.g. Clean, no redness"
                    defaultValue={logFields?.wound_check || ''}
                    onBlur={(e) => setField('wound_check', e.target.value)}
                  />
                </div>
                <div className="border-t-2 border-slate-100 dark:border-slate-800 pt-6">
                  <Label className="text-[26px] font-bold mb-4 block flex items-center gap-2">
                    <ActivitySquare className="w-7 h-7" /> Mobility Note
                  </Label>
                  <Input 
                    className="text-[24px] p-6 h-24 font-medium bg-slate-50 dark:bg-slate-950 border-2 dark:border-slate-800" 
                    placeholder="e.g. Walked with walker 5 mins"
                    defaultValue={logFields?.mobility_note || ''}
                    onBlur={(e) => setField('mobility_note', e.target.value)}
                  />
                </div>
              </div>
            )}
            
            {protocol.vitals.includes('temp_f') && (
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <Label className="text-[26px] font-bold mb-4 block">Temperature (°F)</Label>
                <Input 
                  type="number" 
                  className="text-[32px] p-6 h-24 text-center font-bold bg-slate-50 dark:bg-slate-950 border-2 dark:border-slate-800" 
                  placeholder="98.6"
                  defaultValue={currentLog?.temp_f || ''}
                  onBlur={(e) => {
                    if (e.target.value) setField('temp_f', parseFloat(e.target.value));
                  }}
                />
              </div>
            )}

            {protocol.vitals.includes('pain_score') && (
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <Label className="text-[26px] font-bold mb-4 block">Pain Score (0-10)</Label>
                <Input 
                  type="number" 
                  className="text-[32px] p-6 h-24 text-center font-bold bg-slate-50 dark:bg-slate-950 border-2 dark:border-slate-800" 
                  placeholder="0"
                  min="0" max="10"
                  defaultValue={currentLog?.pain_score || ''}
                  onBlur={(e) => {
                    if (e.target.value) setField('pain_score', parseInt(e.target.value));
                  }}
                />
              </div>
            )}
            
            <Button onClick={() => setActiveView('home')} size="elder" className="w-full text-[24px] bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 h-[80px] mt-8">
              Done with Readings
            </Button>
          </div>
        )}

        {activeView === 'feelings' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 gap-4">
              {SYMPTOM_OPTIONS.map(s => {
                const isSelected = reportedSymptoms.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => handleToggleSymptom(s.id)}
                    disabled={updateLog.isPending}
                    className={`p-8 rounded-3xl border-2 text-left transition-colors flex items-center gap-6 ${
                      isSelected 
                        ? 'bg-primary border-primary text-white shadow-md' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center border-2 ${
                      isSelected ? 'border-white bg-white/20' : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800'
                    }`}>
                      {isSelected && <Check className="w-6 h-6" />}
                    </div>
                    <span className="text-[26px] font-bold leading-tight">{s.label}</span>
                  </button>
                );
              })}
              
              <button
                onClick={() => handleToggleSymptom('none')}
                disabled={updateLog.isPending}
                className={`p-8 rounded-3xl border-2 text-left transition-colors flex items-center gap-6 mt-4 ${
                  reportedSymptoms.length === 0 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 shadow-md' 
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center border-2 ${
                  reportedSymptoms.length === 0 ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-800/50' : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800'
                }`}>
                  {reportedSymptoms.length === 0 && <Check className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
                </div>
                <span className="text-[26px] font-bold leading-tight">No problems today</span>
              </button>
            </div>
            
            <Button onClick={() => setActiveView('home')} size="elder" className="w-full text-[24px] bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 h-[80px] mt-8">
              Back to Home
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
