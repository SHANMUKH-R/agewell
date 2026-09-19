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
import { Activity } from 'lucide-react';

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
    ? 'Blood pressure not measured'
    : `${VITAL_LABELS[key].replace(/\s*\(.+$/, '')} not measured`;
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
      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 dark:border-slate-800/80 dark:bg-slate-900"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className={`${compact ? 'text-sm' : 'text-base'} font-bold tracking-tight text-slate-900 dark:text-slate-100`}>Overall health</h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Day {currentDay} of 7 · {current?.headline || 'No assessment yet'}
          </p>
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 rounded-full hidden sm:inline-block">Trajectory</span>
      </div>
      <div className="flex gap-2" role="list" aria-label="Daily health status">
        {levels.map((item) => (
          <div
            key={item.day}
            role="listitem"
            aria-label={`Day ${item.day}: ${item.level || 'No record'}`}
            title={`Day ${item.day}: ${item.level || 'No record'}`}
            className={`h-10 flex-1 rounded-lg transition-all duration-500 ${item.level ? getLevelColor(item.level) : 'bg-slate-100 dark:bg-slate-800/50'} ${item.day === currentDay ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-900 scale-[1.02] shadow-sm' : ''}`}
          />
        ))}
      </div>
      <div className="mt-3 flex justify-between px-1 text-[11px] font-bold text-slate-400 dark:text-slate-500">
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
      <div className="flex h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 text-center transition-colors dark:border-slate-800 dark:bg-slate-900/20">
        <div className="mb-3 rounded-full bg-slate-100 p-3 dark:bg-slate-800">
          <Activity className="h-6 w-6 text-slate-400 dark:text-slate-500" />
        </div>
        <strong className="text-sm font-bold text-slate-700 dark:text-slate-300">{title || VITAL_LABELS[keyName]}</strong>
        <span className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{noDataMessage(keyName)}</span>
      </div>
    );
  }

  const color = lineColors[keyName];

  return (
    <div className="h-60 min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all duration-300 dark:border-slate-800/60 dark:bg-slate-900/50">
      <h3 className="mb-4 ml-2 text-sm font-bold tracking-tight text-slate-700 dark:text-slate-200">{title || VITAL_LABELS[keyName]}</h3>
      <ResponsiveContainer width="100%" height="100%" className="min-h-[160px]">
        <LineChart data={points} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.7} />
          <XAxis
            dataKey="day"
            tickFormatter={(value) => `D${value}`}
            style={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
          />
          <YAxis
            domain={['auto', 'auto']}
            style={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            width={45}
          />
          <Tooltip
            formatter={(value: number) => [value ?? 'No record', title || VITAL_LABELS[keyName]]}
            labelFormatter={(label) => `Day ${label}`}
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid hsl(var(--border))',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: 'hsl(var(--card))',
              color: 'hsl(var(--card-foreground))'
            }}
            itemStyle={{ color: color, fontWeight: 700 }}
            labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '12px' }}
            cursor={{ stroke: 'hsl(var(--muted))', strokeWidth: 2, strokeDasharray: '4 4' }}
          />
          {baseline != null && (
            <ReferenceLine
              y={baseline}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: 'Discharge Baseline',
                fill: '#64748b',
                fontSize: 12,
                fontWeight: 600,
                position: 'insideTopLeft',
                offset: 6
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            connectNulls={false}
            stroke={color}
            strokeWidth={3}
            dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--card))' }}
            activeDot={{ r: 6, strokeWidth: 0 }}
            animationDuration={800}
          />
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
