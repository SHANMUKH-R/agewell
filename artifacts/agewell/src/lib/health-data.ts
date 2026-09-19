import type { CarePlan, DayLog, Assessment } from '@workspace/api-client-react';

export type VitalKey =
  | 'weight_lb'
  | 'bp_systolic'
  | 'bp_diastolic'
  | 'heart_rate'
  | 'spo2'
  | 'glucose'
  | 'temp_f'
  | 'pain_score';

export type VitalPoint = {
  day: number;
  value: number | null;
  source?: string | null;
  lastSyncedAt?: string | Date | null;
};

export const VITAL_LABELS: Record<VitalKey, string> = {
  weight_lb: 'Weight (lb)',
  bp_systolic: 'Blood pressure — systolic',
  bp_diastolic: 'Blood pressure — diastolic',
  heart_rate: 'Heart rate (bpm)',
  spo2: 'Oxygen (SpO2 %)',
  glucose: 'Glucose (mg/dL)',
  temp_f: 'Temperature (°F)',
  pain_score: 'Pain score',
};

export function getVitalSeries(logs: DayLog[], key: VitalKey): VitalPoint[] {
  return logs.map((log) => ({
    day: log.day,
    value: typeof log[key] === 'number' && Number.isFinite(log[key] as number)
      ? log[key] as number
      : null,
    source: log.source,
    lastSyncedAt: log.last_synced_at,
  }));
}

export function hasVitalData(logs: DayLog[], key: VitalKey) {
  return getVitalSeries(logs, key).some((point) => point.value !== null);
}

export function getRelevantVitals(vitals: string[]): VitalKey[] {
  return vitals.filter((vital): vital is VitalKey => vital in VITAL_LABELS);
}

export function getMedicationDosesPerDay(frequency: string | null | undefined) {
  const value = (frequency || '').toLowerCase();
  if (value.includes('twice') || value.includes('two')) return 2;
  if (value.includes('three') || value.includes('tid')) return 3;
  if (value.includes('four') || value.includes('qid')) return 4;
  if (value.includes('once') || value.includes('daily')) return 1;
  return 1;
}

export type AdherenceResult = {
  taken: number;
  scheduled: number;
  unknown: number;
  missed: number;
  percentage: number | null;
  isAsNeeded: boolean;
};

function isAsNeeded(frequency: string | null | undefined) {
  return /\b(prn|as needed|as-needed|when needed)\b/i.test(frequency || '');
}

export function getMedicationAdherence(
  medication: CarePlan['medications'][number],
  logs: DayLog[],
  currentDay: number,
): AdherenceResult {
  if (isAsNeeded(medication.frequency)) {
    return { taken: 0, scheduled: 0, unknown: 0, missed: 0, percentage: null, isAsNeeded: true };
  }
  const doses = getMedicationDosesPerDay(medication.frequency);
  let taken = 0;
  let scheduled = 0;
  let unknown = 0;
  let missed = 0;

  logs.forEach((log) => {
    const record = log.meds_taken.filter((entry) => entry.med_name === medication.name);
    const dayTaken = Math.min(record.filter((entry) => entry.taken).length, doses);
    const dayMissed = Math.min(record.filter((entry) => !entry.taken).length, Math.max(0, doses - dayTaken));
    taken += dayTaken;
    missed += dayMissed;
    // A missing MedTaken record is unknown, never evidence of a missed dose.
    unknown += Math.max(0, doses - dayTaken - dayMissed);
    scheduled += dayTaken + dayMissed;
  });

  return {
    taken,
    scheduled,
    unknown,
    missed,
    percentage: scheduled ? Math.round((taken / scheduled) * 100) : null,
    isAsNeeded: false,
  };
}

export function getOverallHealthLevels(
  logs: DayLog[],
  assessments: Assessment[],
  currentDay: number,
) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = index + 1;
    const assessment = assessments.find((item) => item.day === day);
    return {
      day,
      level: day <= currentDay ? assessment?.level || 'GREEN' : null,
      headline: assessment?.headline || 'No assessment yet',
    };
  });
}