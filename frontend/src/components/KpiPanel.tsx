import type { Kpis } from '../types';

function KpiCard({
  label,
  value,
  suffix,
  accent,
  sub,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  accent?: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">{label}</p>
      <p className="text-3xl font-bold mt-1" style={{ color: accent ?? '#0f172a' }}>
        {value}
        {suffix && <span className="text-lg font-medium text-slate-400 ml-0.5">{suffix}</span>}
      </p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export function KpiPanel({ kpis }: { kpis: Kpis }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KpiCard
        label="Tasks Scheduled"
        value={kpis.tasks_scheduled}
        sub={`of ${kpis.tasks_total} open tasks (${kpis.tasks_open} open)`}
        accent="#1e40af"
      />
      <KpiCard
        label="Coordinated Blocks"
        value={kpis.blocks}
        sub={`${kpis.combined_blocks} multi-department blocks`}
        accent="#059669"
      />
      <KpiCard
        label="Block Utilization"
        value={kpis.block_utilization_pct}
        suffix="%"
        sub="vs ~45% manual approach"
        accent="#f97316"
      />
      <KpiCard
        label="Critical Defects Open"
        value={kpis.critical_open}
        sub="high-priority pending work"
        accent="#dc2626"
      />
    </div>
  );
}
