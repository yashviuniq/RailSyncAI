import {
  CheckCircle2,
  GitMerge,
  Timer,
  AlertTriangle,
  CalendarDays,
  ShieldCheck,
  TrendingDown,
  Gauge,
} from 'lucide-react';
import type { Kpis } from '../types';
import { fmtMinutes } from '../utils';
import { Panel } from './Panel';

export function KpiPanel({ kpis }: { kpis: Kpis }) {
  return (
    <Panel title="Dashboard KPIs" subtitle="Maintenance, operations, coordination & efficiency at a glance">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          icon={<CalendarDays className="w-4 h-4" />}
          label="Maintenance tasks"
          value={kpis.tasks_scheduled}
          suffix={`of ${kpis.tasks_total}`}
          sub={`${kpis.tasks_open} open backlog`}
          tone="blue"
        />
        <Kpi
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Critical tasks open"
          value={kpis.critical_open}
          sub="highest-risk pending work"
          tone="red"
        />
        <Kpi
          icon={<GitMerge className="w-4 h-4" />}
          label="Coordinated blocks"
          value={kpis.blocks}
          sub={`${kpis.combined_blocks} multi-department`}
          tone="green"
        />
        <Kpi
          icon={<Gauge className="w-4 h-4" />}
          label="Block utilization"
          value={kpis.block_utilization_pct}
          suffix="%"
          sub="vs ~45% manual approach"
          tone="blue"
        />

        <Kpi
          icon={<TrendingDown className="w-4 h-4" />}
          label="Train delay avoided"
          value={fmtMinutes(kpis.train_delay_avoided_min)}
          sub={`${kpis.avg_train_delay_min} min avg block impact`}
          tone="green"
        />
        <Kpi
          icon={<Timer className="w-4 h-4" />}
          label="Maintenance hours saved"
          value={fmtMinutes(kpis.maintenance_hours_saved * 60)}
          sub={`${fmtMinutes(kpis.unused_block_min)} unused block time`}
          tone="yellow"
        />
        <Kpi
          icon={<ShieldCheck className="w-4 h-4" />}
          label="Asset availability"
          value={kpis.asset_availability_pct}
          suffix="%"
          sub="avg track · OHE · signal health"
          tone="green"
        />
        <Kpi
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Resource utilization"
          value={kpis.resource_utilization_pct}
          suffix="%"
          sub={`${kpis.tasks_completed} completed tasks`}
          tone="blue"
        />
      </div>
    </Panel>
  );
}

const TONES: Record<string, { bg: string; text: string }> = {
  blue: { bg: '#e8f0fe', text: '#1a73e8' },
  red: { bg: '#fce8e6', text: '#d93025' },
  green: { bg: '#e6f4ea', text: '#188038' },
  yellow: { bg: '#fef7e0', text: '#b06000' },
};

function Kpi({
  icon,
  label,
  value,
  suffix,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  suffix?: string;
  sub?: string;
  tone: keyof typeof TONES;
}) {
  const t = TONES[tone];
  return (
    <div className="rounded-xl border border-google-softline bg-google-white p-3.5">
      <div className="flex items-center gap-2">
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: t.bg, color: t.text }}
        >
          {icon}
        </span>
        <p className="text-[11px] uppercase tracking-wide text-google-muted font-medium">
          {label}
        </p>
      </div>
      <p className="text-[26px] font-medium mt-2 leading-none" style={{ color: '#202124' }}>
        {value}
        {suffix && <span className="text-base text-google-muted ml-1">{suffix}</span>}
      </p>
      <p className="text-[12px] text-google-muted mt-1.5">{sub}</p>
    </div>
  );
}