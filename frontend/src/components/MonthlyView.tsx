import { CalendarRange, AlertTriangle, Users, Wrench, Layers } from 'lucide-react';
import type { Plan } from '../types';
import { DEPT_COLORS } from '../utils';
import { Panel, Stat } from './Panel';

export function MonthlyView({
  plan,
  resources,
}: {
  plan: Plan;
  resources: { crews: Record<string, string[]>; machines: Record<string, string[]>; total_crews: number; total_machines: number };
}) {
  const k = plan.kpis as Record<string, any>;
  const workload: Record<string, number> = k.department_workload_min ?? {};
  const maxWorkload = Math.max(720, ...Object.values(workload));

  return (
    <div className="space-y-5">
      <Panel
        title={`Monthly Capacity Plan — ${k.month ?? ''}`}
        subtitle="Strategic view: backlog, department workload, resources and projected demand (execution detail lives in the Weekly tab)"
        icon={<CalendarRange className="w-4 h-4" />}
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Open tasks" value={k.open_tasks ?? 0} sub="current backlog" />
          <Stat label="Critical open" value={k.critical_open ?? 0} accent="#d93025" sub="must clear this month" />
          <Stat label="High-severity open" value={k.high_open ?? 0} accent="#f9ab00" sub="priority B" />
          <Stat label="Weekly blocks" value={k.weekly_blocks ?? 0} sub="from optimizer" />
          <Stat label="Monthly demand (est.)" value={k.monthly_task_demand_est ?? 0} sub="forecasted inflow" />
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* department workload */}
          <div>
            <h3 className="text-[13px] font-medium text-google-ink mb-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-google-muted" />
              Department workload (scheduled min)
            </h3>
            {Object.keys(workload).length > 0 ? (
              <div className="space-y-2.5">
                {Object.entries(workload).map(([dept, min]) => (
                  <div key={dept}>
                    <div className="flex items-center justify-between text-[12px] mb-1">
                      <span className="text-google-gray">{dept}</span>
                      <span className="font-medium text-google-ink text-right">
                        {Math.round(min / 60)}h · {Math.round((min / maxWorkload) * 100)}%
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-google-bg overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (min / maxWorkload) * 100)}%`,
                          background: DEPT_COLORS[dept] ?? '#1a73e8',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-google-muted">No workload data yet.</p>
            )}
          </div>

          {/* planned vs capacity */}
          <CapacityVsBacklog k={k} />
        </div>
      </Panel>

      <Panel
        title="Resource pool"
        subtitle="Simulated crew and machine availability driving the CP-SAT constraints"
        icon={<Users className="w-4 h-4" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {['Engineering', 'S&T', 'Electrical'].map((dept) => {
            const crews = resources.crews[dept] ?? [];
            const machines = resources.machines[dept] ?? [];
            return (
              <div key={dept} className="rounded-xl border border-google-softline p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: DEPT_COLORS[dept] }} />
                  <span className="text-[13px] font-medium text-google-ink">{dept}</span>
                </div>
                <div className="flex items-center gap-4 text-[12px] text-google-gray">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-google-muted" />
                    {crews.length} crew ({crews.join(', ')})
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-google-muted" />
                    {machines.length} machines ({machines.join(', ')})
                  </span>
                </div>
              </div>
            );
          })}
          <div className="rounded-xl border border-google-softline p-3 md:col-span-2 flex items-center gap-2 text-[12px] text-google-muted bg-google-bg">
            <AlertTriangle className="w-4 h-4 text-[#f9ab00]" />
            Crew shift capacity is enforced by the optimizer as a hard constraint each day.
          </div>
        </div>
      </Panel>
    </div>
  );
}

function CapacityVsBacklog({ k }: { k: Record<string, any> }) {
  const backlog = k.open_tasks ?? 0;
  const demand = k.monthly_task_demand_est ?? 0;
  const weeklyTasks = k.weekly_tasks ?? 0;
  const perWeekCapacity = weeklyTasks; // tasks cleared in one optimized week
  const capacity = perWeekCapacity * 4; // extrapolate over ~4 weeks
  const pct = Math.min(100, Math.round((backlog + demand) / Math.max(capacity, 1) * 100));
  return (
    <div>
      <h3 className="text-[13px] font-medium text-google-ink mb-2 flex items-center gap-1.5">
        <Layers className="w-4 h-4 text-google-muted" />
        Planned vs available capacity
      </h3>
      <div className="rounded-xl border border-google-softline p-3.5">
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-[11px] uppercase text-google-muted">Backlog + inflow</p>
            <p className="text-xl font-medium text-google-ink">
              {backlog + demand} <span className="text-xs text-google-muted">tasks</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase text-google-muted">Monthly capacity (est.)</p>
            <p className="text-xl font-medium text-google-green-dark">
              {capacity} <span className="text-xs text-google-muted">tasks</span>
            </p>
          </div>
        </div>
        <div className="h-4 rounded-full bg-google-bg overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: pct > 100 ? '#d93025' : '#1a73e8',
            }}
          />
        </div>
        <p className="text-[11px] text-google-muted mt-1.5">
          Crude monthly plan ~{pct}% utilized · refine weekly for execution
        </p>
      </div>
    </div>
  );
}