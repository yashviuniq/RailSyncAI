import type { Plan } from '../types';
import { DEPT_COLORS } from '../utils';
import { Panel } from './Panel';

export function MonthlyView({ plan }: { plan: Plan }) {
  const k = plan.kpis;
  return (
    <Panel
      title={`Monthly Capacity Plan — ${k.month ?? ''}`}
      subtitle="Strategic view: backlog, department workload and projected demand (weekly detail is in the Weekly tab)"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Metric label="Open tasks" value={k.open_tasks} />
        <Metric label="Critical open" value={k.critical_open} accent="#dc2626" />
        <Metric label="High-severity open" value={k.high_open} accent="#f97316" />
        <Metric label="Monthly demand (est.)" value={k.monthly_task_demand_est} />
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">
          Department workload (scheduled maintenance minutes)
        </h3>
        {k.department_workload_min && Object.keys(k.department_workload_min).length > 0 ? (
          <div className="space-y-2">
            {(Object.entries(k.department_workload_min) as [string, number][]).map(
              ([dept, min]) => (
              <div key={dept} className="flex items-center gap-3">
                <span className="w-24 text-xs text-slate-600">{dept}</span>
                <div className="flex-1 h-6 bg-slate-100 rounded overflow-hidden">
                  <div
                    className="h-full"
                    style={{
                      width: `${Math.min(100, (min / 720) * 100)}%`,
                      background: DEPT_COLORS[dept] ?? '#64748b',
                    }}
                  />
                </div>
                <span className="w-16 text-xs font-medium text-slate-700 text-right">
                  {Math.round(min / 60) }h
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No workload data yet.</p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="text-xs uppercase text-slate-400 font-medium">Weekly blocks</p>
          <p className="text-2xl font-bold text-slate-800">{k.weekly_blocks}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="text-xs uppercase text-slate-400 font-medium">Weekly tasks</p>
          <p className="text-2xl font-bold text-slate-800">{k.weekly_tasks}</p>
        </div>
      </div>
    </Panel>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400 font-medium">{label}</p>
      <p className="text-3xl font-bold mt-1" style={{ color: accent ?? '#0f172a' }}>
        {value ?? 0}
      </p>
    </div>
  );
}
