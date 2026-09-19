import { useCallback, useEffect, useRef, useState } from 'react';
import { useGetAgewellState, useGetAgewellPatient, useUpdateAgewellLog, getGetAgewellPatientQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { getLevelColor } from '@/lib/utils';
import { Check, PhoneCall, Pill, Activity, SmilePlus, ArrowLeft, Utensils, ActivitySquare, ShieldAlert, CheckCircle2, Mic, MicOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { QueryError } from '@/components/ui/query-error';
import { useAccessibility } from '@/lib/accessibility';
import { AccessibilityBar } from '@/components/AccessibilityBar';
import { OverallHealth, VitalsGrid } from '@/components/HealthVisuals';
import { getMedicationInstruction } from '@/lib/health-data';

type ElderView = 'home' | 'recovery' | 'meds' | 'readings' | 'feelings';

const actorLabels: Record<string, string> = {
  pharmacist: 'Your pharmacist',
  nurse: 'Your nurse',
  physician: 'Your doctor',
  caregiver: 'Your family caregiver',
  emergency: 'Emergency services',
};

function isMedicationInstruction(text: string) {
  const medicationWord = /\b(medication|medicine|drug|dose|dosing|tablet|pill|capsule)\b/i;
  const instructionWord = /\b(start|stop|change|adjust|increase|decrease|take|hold|skip|resume|discontinue|double)\b/i;
  const numericDose = /\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|tablet|tablets|pill|pills|capsule|capsules)\b/i;

  return (
    numericDose.test(text) ||
    (medicationWord.test(text) && instructionWord.test(text)) ||
    /\b(start|stop|change|adjust)\b.{0,40}\b(medication|medicine|dose|drug|pill|tablet)\b/i.test(text)
  );
}

function formatAppointmentDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function ElderApp() {
  const { data: state } = useGetAgewellState();
  const id = state?.selected_patient_id || 'margaret';
  const { data: patient, isLoading, isError, error, refetch } = useGetAgewellPatient(id);
  const { toast } = useToast();
  const { zoom } = useAccessibility();
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
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'unsupported' | 'error'>('idle');
  const recognitionRef = useRef<any>(null);
  const stopVoiceRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (!recognition) return;
    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try {
      recognition.abort?.();
    } catch {
      // The browser may throw if recognition already ended.
    }
  }, []);

  useEffect(() => stopVoiceRecognition, [stopVoiceRecognition]);

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

  const startVoiceLogging = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceStatus('unsupported');
      return;
    }
    stopVoiceRecognition();
    let recognition: any;
    try {
      recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognitionRef.current = recognition;
      const finish = (status: 'idle' | 'error') => {
        if (recognitionRef.current !== recognition) return;
        recognitionRef.current = null;
        recognition.onstart = null;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        setVoiceStatus(status);
      };
      recognition.onstart = () => setVoiceStatus('listening');
      recognition.onerror = () => finish('error');
      recognition.onend = () => finish('idle');
      recognition.onresult = (event: any) => {
        const spoken = String(event.results?.[0]?.[0]?.transcript || '').toLowerCase();
        const match = SYMPTOM_OPTIONS.find((symptom) =>
          spoken.includes(symptom.id) || spoken.includes(symptom.label.toLowerCase()),
        );
        finish(match ? 'idle' : 'error');
        if (match) handleToggleSymptom(match.id);
      };
      recognition.start();
    } catch {
      stopVoiceRecognition();
      setVoiceStatus('error');
    }
  };

  const SYMPTOM_OPTIONS = [
    { id: 'fatigue', label: 'Tired', emoji: '😴' },
    { id: 'dizziness on standing', label: 'Dizzy', emoji: '😵‍💫' },
    { id: 'short of breath climbing stairs', label: 'Short of breath', emoji: '😮‍💨' },
    { id: 'ankle swelling', label: 'Swelling in ankles', emoji: '🦶' },
    { id: 'chest pain', label: 'Chest pain', emoji: '💢' },
  ];

  // Using 'any' type cast for transient new fields until types are generated
  const logFields = currentLog as any;
  const setField = (field: string, value: any) => {
    updateLog.mutate({ id, data: { fields: { [field]: value } } });
  };

  const totalMeds = care_plan.medications.length;
  const takenMeds = care_plan.medications.filter(med => currentLog?.meds_taken.some(m => m.med_name === med.name && m.taken)).length;
  const followUpAppointments = [...care_plan.follow_up]
    .filter(appointment => appointment.due_date)
    .sort((a, b) => {
      return new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime();
    });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextAppointmentIndex = Math.max(
    0,
    followUpAppointments.findIndex(appointment => {
      const date = new Date(appointment.due_date || '');
      date.setHours(0, 0, 0, 0);
      return date >= today;
    }),
  );
  const careTeamName = actorLabels[current_assessment.who_should_act] || 'Your care team';
  const careTeamAction = isMedicationInstruction(current_assessment.recommended_action)
    ? "They're reviewing your care."
    : current_assessment.recommended_action;
  const severityPanelClass = current_assessment.level === 'RED'
    ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900'
    : current_assessment.level === 'ORANGE'
      ? 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900'
      : 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900';
  const spokenHomeContext = [
    current_assessment.level === 'ORANGE' || current_assessment.level === 'RED'
      ? 'AgeWell noticed something and told your care team.'
      : '',
    current_assessment.level !== 'GREEN'
      ? `Your care team is on it. ${careTeamName}. ${careTeamAction}`
      : '',
    followUpAppointments.length > 0
      ? `Next appointment: ${followUpAppointments[nextAppointmentIndex].provider}, ${followUpAppointments[nextAppointmentIndex].specialty || 'follow-up'}, ${formatAppointmentDate(followUpAppointments[nextAppointmentIndex].due_date || '')}.`
      : '',
  ].filter(Boolean).join(' ');

  const firstName = care_plan.patient.name.split(' ')[0];
  const statusPhrase =
    current_assessment.level === 'GREEN' ? 'You are on track today.' :
    current_assessment.level === 'YELLOW' ? "We're keeping an eye on something." :
    current_assessment.level === 'ORANGE' ? 'Your care team has been notified.' :
    'Please contact help now.';

  // Text narrated when the elder taps "Read aloud" — plain, no clinical numbers.
  const readText =
    activeView === 'home'
       ? `Good morning, ${firstName}. Today is day ${day} of 7. ${statusPhrase} You have taken ${takenMeds} of ${totalMeds} medications today. ${followUpAppointments.length > 0 ? `Your next appointment is ${followUpAppointments[nextAppointmentIndex].provider} on ${formatAppointmentDate(followUpAppointments[nextAppointmentIndex].due_date || '')}.` : ''} ${current_assessment.level !== 'GREEN' ? `Your care team is on it. ${careTeamName}.` : ''}`
      : activeView === 'recovery'
      ? `${statusPhrase} ${patient.summary.patient_summary}`
      : activeView === 'meds'
      ? `Today's medications. You have taken ${takenMeds} of ${totalMeds} so far. Tap Mark Taken after you take each one.`
      : activeView === 'readings'
       ? 'Today\'s readings arrive automatically from your connected devices. Manual entry is available as a fallback when no device is connected.'
      : 'How are you feeling today? Tap any symptoms you have, or tap No problems today.';

  return (
    <div
      style={{ zoom }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24 text-[20px] font-sans"
    >
      <AccessibilityBar readText={readText} />
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
          <div className="space-y-6" aria-label={spokenHomeContext || undefined}>
            {(current_assessment.level === 'ORANGE' || current_assessment.level === 'RED') && (
              <div
                role="status"
                className={`rounded-3xl border-2 p-6 shadow-sm ${severityPanelClass}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`mt-1 h-8 w-8 rounded-full ${getLevelColor(current_assessment.level)} shrink-0`} />
                  <div>
                    <h2 className="text-[26px] font-bold">Your care team has been told</h2>
                    <p className="mt-2 text-[20px] font-medium text-slate-700 dark:text-slate-300">
                      AgeWell noticed something and told your care team.
                    </p>
                  </div>
                </div>
              </div>
            )}

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

            <OverallHealth logs={logs} assessments={patient.assessments} currentDay={day} compact />

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
                 <div className="text-[20px] text-slate-500 dark:text-slate-400 font-medium">View your daily vitals</div>
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

            {current_assessment.level !== 'GREEN' && (
              <section className={`rounded-3xl border-2 p-7 shadow-sm ${severityPanelClass}`} aria-label="Care team notified">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="mt-1 h-8 w-8 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <h2 className="text-[26px] font-bold">Your care team is on it.</h2>
                    <p className="mt-3 text-[21px] font-bold">{careTeamName}</p>
                    <p className="mt-2 text-[20px] leading-relaxed text-slate-700 dark:text-slate-300">
                      {careTeamAction}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {followUpAppointments.length > 0 && (
              <section className="rounded-3xl border-2 border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-label="Appointment reminders">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-[26px] font-bold">Appointment reminders</h2>
                    <p className="mt-1 text-[19px] text-slate-500 dark:text-slate-400">Your upcoming follow-up visits</p>
                  </div>
                  <Activity className="h-8 w-8 shrink-0 text-sky-600 dark:text-sky-400" />
                </div>
                <div className="space-y-3">
                  {followUpAppointments.map((appointment, index) => (
                    <div
                      key={`${appointment.provider}-${appointment.due_date}-${index}`}
                      className={`rounded-2xl border-2 p-4 ${index === nextAppointmentIndex
                        ? 'border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/30'
                        : 'border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40'
                      }`}
                    >
                      <p className="text-[21px] font-bold">
                        {appointment.provider} — {appointment.specialty || 'Follow-up'}
                      </p>
                      <p className="mt-1 text-[20px] text-slate-600 dark:text-slate-300">
                        {formatAppointmentDate(appointment.due_date || '')}
                        {index === nextAppointmentIndex && (
                          <span className="ml-3 font-bold text-sky-700 dark:text-sky-300">Next visit</span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
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
                      <div className="text-[28px] font-bold text-slate-900 dark:text-slate-100 leading-tight mb-1">{getMedicationInstruction(med, care_plan.medications.indexOf(med))}</div>
                      <div className="text-[24px] text-slate-600 dark:text-slate-400 font-medium">{med.name}</div>
                      <div className="mt-1 text-base text-slate-500 dark:text-slate-400">
                        Expires {med.expires_at ? new Date(med.expires_at).toLocaleDateString() : 'not recorded'}
                      </div>
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
            <div className="rounded-3xl border-2 border-sky-200 bg-sky-50 p-6 shadow-sm dark:border-sky-900 dark:bg-sky-950/20">
              <h2 className="text-[26px] font-bold">Automatic daily readings</h2>
              <p className="mt-2 text-[20px] text-slate-700 dark:text-slate-300">
                Readings come from simulated connected devices. Missing measurements stay as no record.
              </p>
              <p className="mt-3 text-base font-semibold text-sky-800 dark:text-sky-300">
                Source: {currentLog?.source || 'No device record'} · Last synced: {currentLog?.last_synced_at ? new Date(currentLog.last_synced_at).toLocaleString() : 'Not synced'}
              </p>
            </div>
            <VitalsGrid logs={logs} carePlan={care_plan} protocol={protocol} />
            <details className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <summary className="cursor-pointer text-xl font-bold text-slate-600 dark:text-slate-300">Manual fallback (when no device is connected)</summary>
              <div className="mt-6 space-y-6">
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
              </div>
            </details>
            
            <Button onClick={() => setActiveView('home')} size="elder" className="w-full text-[24px] bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 h-[80px] mt-8">
              Done with Readings
            </Button>
          </div>
        )}

        {activeView === 'feelings' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="rounded-3xl border-2 border-sky-200 bg-sky-50 p-5 dark:border-sky-900 dark:bg-sky-950/20">
              <button
                type="button"
                onClick={startVoiceLogging}
                disabled={voiceStatus === 'listening'}
                className="flex min-h-[60px] w-full items-center justify-center gap-3 rounded-2xl bg-sky-700 px-5 py-3 text-xl font-bold text-white hover:bg-sky-800 disabled:opacity-70"
              >
                {voiceStatus === 'listening' ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                {voiceStatus === 'listening' ? 'Listening… say a symptom' : 'Say a symptom'}
              </button>
              {voiceStatus === 'unsupported' && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Voice logging is not supported in this browser. You can still tap a symptom.</p>}
              {voiceStatus === 'error' && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">I could not match that. Try saying “tired,” “dizzy,” or another button below.</p>}
            </div>
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
                    <span className="text-[26px] font-bold leading-tight">{s.emoji} {s.label}</span>
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
      {current_assessment.level === 'RED' && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] border-t-2 border-red-200 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.15)] backdrop-blur dark:border-red-900 dark:bg-slate-950/95">
          <a href="tel:911" className="mx-auto flex min-h-[52px] max-w-2xl items-center justify-center gap-3 rounded-xl bg-red-600 px-4 py-2 text-xl font-bold text-white hover:bg-red-700">
            <PhoneCall className="h-6 w-6" /> Call 911
          </a>
        </div>
      )}
    </div>
  );
}
