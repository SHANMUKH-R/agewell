import type { CarePlan, DayLog, Assessment, Protocol } from '@workspace/api-client-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  VITAL_LABELS,
  getOverallHealthLevels,
  getRelevantVitals,
  getVitalSeries,
  type VitalKey,
} from '@/lib/health-data';
import { getLevelColor } from '@/lib/utils';

const lineColors: Record<VitalKey, string> = {
  weight_lb: '#0ea5e9',
  bp_systolic: '#6366f1',
  bp_diastolic: '#8b5cf6',
  heart_rate: '#f43f5e',
  spo2: '#10b981',
  glucose: '#f59e0b',
  temp_f: '#ef4444',
  pain_score: '#ec4899',
};

function noDataMessage(key: VitalKey) {
  return key === 'bp_systolic' || key === 'bp_diastolic'
    ? 'No record — blood pressure not measured'
    : `No record — ${VITAL_LABELS[key].replace(/\s*\(.+$/, '').toLowerCase()} not measured`;
}

export function OverallHealth({
  logs,
  assessments,
  currentDay,
  compact = false,
}: {
  logs: DayLog[];
  assessments: Assessment[];
  currentDay: number;
  compact?: boolean;
}) {
  const levels = getOverallHealthLevels(logs, assessments, currentDay);
  const current = levels[currentDay - 1];
  return (
    <section
      aria-label="Overall health, seven-day recovery trajectory"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className={`${compact ? 'text-sm' : 'text-base'} font-bold`}>Overall health</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Day {currentDay} of 7 · {current?.headline || 'No assessment yet'}
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-500">Recovery trajectory</span>
      </div>
      <div className="flex gap-1.5" role="list" aria-label="Daily health status">
        {levels.map((item) => (
          <div
            key={item.day}
            role="listitem"
            aria-label={`Day ${item.day}: ${item.level || 'No record'}`}
            title={`Day ${item.day}: ${item.level || 'No record'}`}
            className={`h-8 flex-1 rounded-md ${item.level ? getLevelColor(item.level) : 'bg-slate-200 dark:bg-slate-700'} ${item.day === currentDay ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-900' : ''}`}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-500">
        {levels.map((item) => <span key={item.day}>D{item.day}</span>)}
      </div>
    </section>
  );
}

export function VitalTrend({
  logs,
  keyName,
  baseline,
  title,
}: {
  logs: DayLog[];
  keyName: VitalKey;
  baseline: number | null | undefined;
  title?: string;
}) {
  const points = getVitalSeries(logs, keyName);
  const hasData = points.some((point) => point.value !== null);
  if (!hasData) {
    return (
      <div className="flex h-48 flex-col justify-center rounded-lg border border-dashed border-slate-300 px-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <strong>{title || VITAL_LABELS[keyName]}</strong>
        <span className="mt-1">{noDataMessage(keyName)}</span>
      </div>
    );
  }
  const color = lineColors[keyName];
  return (
    <div className="h-48 min-w-0">
      <h3 className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">{title || VITAL_LABELS[keyName]}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 5, right: 8, bottom: 5, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="day" tickFormatter={(value) => `D${value}`} style={{ fontSize: 10 }} />
          <YAxis domain={['auto', 'auto']} style={{ fontSize: 10 }} />
          <Tooltip formatter={(value) => [value ?? 'No record', title || VITAL_LABELS[keyName]]} />
          {baseline != null && (
            <ReferenceLine y={baseline} stroke="#64748b" strokeDasharray="4 4" label={{ value: 'Baseline', fill: '#64748b', fontSize: 10 }} />
          )}
          <Line type="monotone" dataKey="value" connectNulls={false} stroke={color} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VitalsGrid({
  logs,
  carePlan,
  protocol,
}: {
  logs: DayLog[];
  carePlan: CarePlan;
  protocol: Protocol;
}) {
  const keys = getRelevantVitals(protocol.vitals);
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {keys.map((key) => (
        <VitalTrend
          key={key}
          logs={logs}
          keyName={key}
          baseline={(carePlan.discharge_baseline as unknown as Record<string, number | null | undefined>)[key]}
        />
      ))}
    </div>
  );
}