import {
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { BeforeAfter, Kpis } from '../types';
import { fmtMinutes } from '../utils';
import { Panel, Badge } from './Panel';

export function CompareView({ data, kpis }: { data: BeforeAfter; kpis: Kpis }) {
  const chartData = data.metric.map((m, i) => ({
    name: shortName(m),
    Existing: data.existing[i],
    Proposed: data.proposed[i],
  }));

  return (
    <div className="space-y-5">
      {/* headline strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Headline label="Block events" before={data.existing[0]} after={data.proposed[0]} lowerBetter fmt={fmtCount} />
        <Headline label="Est. train delay" before={data.existing[2]} after={data.proposed[2]} lowerBetter unit="min" />
        <Headline label="Block utilization" before={data.existing[3]} after={data.proposed[3]} better unit="%" />
        <Headline label="Tasks addressed" before={data.existing[4]} after={data.proposed[4]} better />
      </div>

      <Panel
        title="Before vs After — manual vs intelligent planning"
        subtitle={
          <>
            Existing decentralized BDMS approach vs. coordination layer ·{' '}
            <Badge className="bg-[#e8f0fe] text-google-blue-dark">
              <AlertTriangle className="w-3 h-3" /> synthetic / prototype data
            </Badge>
          </>
        }
        icon={<Scale className="w-4 h-4" />}
        actions={
          <div className="flex items-center gap-2 text-[12px] text-google-gray">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#dadce0]" /> Existing
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-google-blue" /> Proposed
            </span>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-google-softline text-left">
                  <th className="py-2 pr-2 text-google-muted font-medium whitespace-nowrap">Metric</th>
                  <th className="py-2 pr-2 text-google-muted font-medium text-center">Existing</th>
                  <th className="py-2 text-google-muted font-medium text-center">Proposed</th>
                  <th className="py-2 pl-3 text-google-muted font-medium text-right">Δ</th>
                </tr>
              </thead>
              <tbody>
                {data.metric.map((m, i) => {
                  const existing = data.existing[i];
                  const proposed = data.proposed[i];
                  const higherBetter = i === 1 || i === 3 || i === 4;
                  const diff = proposed - existing;
                  const better = higherBetter ? diff > 0 : diff < 0;
                  const same = diff === 0;
                  const suffix = m.includes('%') ? '%' : '';
                  return (
                    <tr key={m} className="border-b border-google-softline">
                      <td className="py-2.5 pr-2 text-google-ink">{m}</td>
                      <td className="py-2.5 pr-2 text-center font-medium text-google-gray">
                        {existing}{suffix}
                      </td>
                      <td className="py-2.5 pr-2 text-center font-medium text-google-ink">
                        {proposed}{suffix}
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        {same ? (
                          <span className="inline-flex items-center gap-1 text-google-muted">—</span>
                        ) : better ? (
                          <span className="inline-flex items-center gap-0.5 text-[#188038] font-medium">
                            <ArrowDownRight className={`w-4 h-4 ${higherBetter ? 'rotate-180' : ''}`} />
                            {Math.abs(diff)}{suffix}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[#d93025] font-medium">
                            <ArrowUpRight className={`w-4 h-4 ${higherBetter ? 'rotate-180' : ''}`} />
                            {Math.abs(diff)}{suffix}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-[11px] text-google-muted mt-3 leading-snug">
              Same underlying synthetic data for both sides. Manual numbers model the current
              one-block-per-defect, one-department workflow booked in daytime traffic.
            </p>
          </div>

          <div className="lg:col-span-3">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8eaed" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#5f6368' }} axisLine={{ stroke: '#dadce0' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#5f6368' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f8f9fa' }}
                  contentStyle={{ borderRadius: 8, border: '1px solid #dadce0', fontSize: 12 }}
                />
                <Bar dataKey="Existing" fill="#dadce0" radius={[6, 6, 0, 0]} barSize={22} />
                <Bar dataKey="Proposed" fill="#1a73e8" radius={[6, 6, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Panel>

      <Panel title="Expected gains" subtitle="What coordination earns (synthetic estimate)">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Gain
            label="Train delay avoided"
            value={fmtMinutes(kpis.train_delay_avoided_min)}
            sub={`delay of ${data.existing[2]} min reduced to ${data.proposed[2]} min`}
          />
          <Gain
            label="Maintenance hours saved"
            value={fmtMinutes(kpis.maintenance_hours_saved * 60)}
            sub={`${kpis.combined_blocks} blocks run multi-department`}
          />
          <Gain
            label="Unused block time"
            value={fmtMinutes(kpis.unused_block_min)}
            sub={`${fmtMinutes(kpis.total_block_min)} reserved in total`}
          />
        </div>
      </Panel>
    </div>
  );
}

function shortName(m: string): string {
  if (m.includes('Total block')) return 'Blocks';
  if (m.includes('Combined')) return 'Combined';
  if (m.includes('Train impact')) return 'Delay';
  if (m.includes('utilization')) return 'Utilization %';
  if (m.includes('addressed')) return 'Tasks';
  return m;
}

function Headline({
  label,
  before,
  after,
  unit,
  better,
  lowerBetter,
  fmt,
}: {
  label: string;
  before: number;
  after: number;
  unit?: string;
  better?: boolean;
  lowerBetter?: boolean;
  fmt?: (n: number) => string;
}) {
  const improved = (better && after > before) || (lowerBetter && after < before);
  const same = after === before;
  const showUp = better ? after > before : after < before;
  return (
    <div className="g-card p-3.5">
      <p className="text-[11px] uppercase tracking-wide text-google-muted font-medium">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-google-gray text-lg font-medium line-through decoration-google-muted/40">
          {fmt ? fmt(before) : before}
        </span>
        <span className="text-google-line font-medium">→</span>
        <span className="text-2xl font-medium text-google-ink">
          {fmt ? fmt(after) : after}
          {unit && <span className="text-sm text-google-muted ml-0.5">{unit}</span>}
        </span>
        {same ? (
          <Minus className="w-5 h-5 text-google-muted" />
        ) : improved ? (
          <ArrowUpRight className={`w-5 h-5 text-[#34a853] ${showUp ? '' : 'rotate-180'}`} />
        ) : (
          <ArrowUpRight className={`w-5 h-5 text-[#ea4335] ${showUp ? '' : 'rotate-180'}`} />
        )}
      </div>
      <p className="text-[12px] text-google-gray mt-1">
        {label === 'Block events'
          ? `${fmtCount(before)} separate blocks → ${fmtCount(after)} optimized blocks`
          : label === 'Est. train delay'
            ? `${before} min → ${after} min of disruption`
            : label === 'Block utilization'
              ? `${before}% → ${after}% window usage`
              : `${before} → ${after} defects handled`}
      </p>
    </div>
  );
}

function fmtCount(n: number): string {
  return n.toString();
}

function Gain({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-google-softline bg-google-white p-3.5">
      <p className="text-[11px] uppercase tracking-wide text-google-muted font-medium">{label}</p>
      <p className="text-2xl font-medium text-[#188038] mt-1">{value}</p>
      <p className="text-[12px] text-google-gray mt-0.5">{sub}</p>
    </div>
  );
}