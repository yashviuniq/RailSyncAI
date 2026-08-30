import { useState } from 'react';
import {
  CalendarDays,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Lock,
  Sparkles,
} from 'lucide-react';
import type { Plan } from '../types';
import { api } from '../api';
import { fmtTime, fmtMinutes, DEPT_COLORS } from '../utils';
import { Panel, Badge } from './Panel';

const HOURS = 24;
const MINUTE_W = 1.5; // px per minute

function parseMinute(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export function WeeklyPlan({
  plan,
  canPlan,
  onChanged,
}: {
  plan: Plan;
  canPlan: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const sections = Array.from(new Set(plan.blocks.map((b) => b.section_id))).sort();
  const width = HOURS * 60 * MINUTE_W;

  const setStatus = async (blockId: string, status: string) => {
    if (busy) return;
    setBusy(blockId);
    try {
      await api.setBlockStatus(blockId, status);
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  return (
    <Panel
      title="Weekly Block Plan"
      subtitle={
        <>
          {plan.horizon} plan · {plan.start} → {plan.end} · optimizer:{' '}
          {plan.kpis.solver_status ?? 'n/a'} · planner can approve / reject / edit
        </>
      }
      icon={<CalendarDays className="w-4 h-4" />}
    >
      {/* time axis */}
      <div className="relative ml-28 mb-1" style={{ width }}>
        {Array.from({ length: HOURS }, (_, h) => (
          <span
            key={h}
            className="absolute text-[10px] text-google-muted"
            style={{ left: h * 60 * MINUTE_W }}
          >
            {h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}
          </span>
        ))}
      </div>

      {sections.map((sec) => (
        <div key={sec} className="flex items-center mb-2">
          <div className="w-28 shrink-0 text-[13px] font-medium text-google-ink pr-2">{sec}</div>
          <div className="relative rounded-lg bg-google-bg h-10" style={{ width }}>
            {Array.from({ length: HOURS + 1 }, (_, h) => (
              <div
                key={h}
                className="absolute top-0 bottom-0 w-px bg-google-softline"
                style={{ left: h * 60 * MINUTE_W }}
              />
            ))}
            {plan.blocks
              .filter((b) => b.section_id === sec)
              .map((b) => {
                const start = parseMinute(b.start);
                const end = parseMinute(b.end);
                const w = Math.max(8, (end - start) * MINUTE_W);
                const deptKeys = Array.from(new Set(b.departments));
                const multi = deptKeys.length > 1;
                const color = multi
                  ? 'linear-gradient(90deg,#1a73e8,#188038,#f9ab00)'
                  : DEPT_COLORS[deptKeys[0]] ?? '#80868b';
                const approved = b.status === 'APPROVED';
                const rejected = b.status === 'REJECTED';
                return (
                  <div
                    key={b.block_id}
                    className={`absolute top-0.5 bottom-0.5 rounded-md flex items-center overflow-hidden ${
                      approved ? 'ring-2 ring-[#188038]' : rejected ? 'opacity-45' : ''
                    }`}
                    style={{ left: start * MINUTE_W, width: w, background: color }}
                  >
                    {w > 44 ? (
                      <span className="text-[10px] text-white font-medium truncate px-1.5 w-full">
                        {deptKeys.join('+')} · {leftZero(end - start)}
                      </span>
                    ) : (
                      <span className="text-[9px] text-white font-medium w-full text-center">
                        {deptKeys.length > 1 ? '⚉' : '•'}
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      {/* legend + block list */}
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-google-gray items-center">
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: DEPT_COLORS['Engineering'] }} /> Engineering
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: DEPT_COLORS['S&T'] }} /> S&amp;T
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: DEPT_COLORS['Electrical'] }} /> Electrical
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className="w-3 h-3 rounded flex items-center justify-center text-[9px] text-white"
            style={{ background: 'linear-gradient(90deg,#1a73e8,#188038,#f9ab00)' }}
          >⚉</span>
          Coordinated (multi-dept)
        </span>
      </div>

      {/* block cards with actions */}
      <div className="mt-4 space-y-2">
        <p className="text-[12px] font-medium text-google-ink uppercase tracking-wide text-google-muted">
          {plan.blocks.length} scheduled blocks
        </p>
        {plan.blocks.map((b) => (
          <div
            key={b.block_id}
            className={`rounded-xl border p-3 bg-google-white flex items-center gap-3 flex-wrap ${
              b.status === 'APPROVED'
                ? 'border-[#34a85340]'
                : b.status === 'REJECTED'
                  ? 'border-google-line opacity-70'
                  : 'border-google-softline'
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13.5px] font-medium text-google-ink">{b.block_id}</span>
                <Badge className="bg-[#e8f0fe] text-google-blue-dark">{b.section_name}</Badge>
                <StatusPill status={b.status} />
                {Array.from(new Set(b.departments)).length > 1 && (
                  <Badge className="bg-[#e6f4ea] text-[#188038]">
                    <Sparkles className="w-3 h-3" /> coordinated
                  </Badge>
                )}
              </div>
              <p className="text-[12px] text-google-gray mt-1">
                {fmtTime(b.start)} – {fmtTime(b.end)} · {fmtMinutes((parseMinute(b.end) - parseMinute(b.start)))} ·{' '}
                {b.departments.join(' + ')} · {b.tasks.length} tasks · ~{b.train_impact_min} min train impact
              </p>
              {b.notes && <p className="text-[11.5px] text-google-muted mt-0.5">Why: {b.notes}</p>}
            </div>

            {canPlan ? (
              <div className="flex items-center gap-1.5">
                <button
                  disabled={busy !== null}
                  onClick={() => setStatus(b.block_id, 'APPROVED')}
                  className={`g-chip ${b.status === 'APPROVED' ? 'g-chip-active !border-[#188038] !text-[#188038]' : ''}`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" /> Approve
                </button>
                <button
                  disabled={busy !== null}
                  onClick={() => setStatus(b.block_id, 'REJECTED')}
                  className="g-chip hover:!border-[#d93025] hover:!text-[#d93025]"
                >
                  <ThumbsDown className="w-3.5 h-3.5" /> Reject
                </button>
                {b.status === 'APPROVED' && (
                  <CheckCircle2 className="w-4 h-4 text-[#188038]" />
                )}
              </div>
            ) : (
              <span className="text-[11.5px] text-google-muted inline-flex items-center gap-1">
                <Lock className="w-3 h-3" /> planner approval only
              </span>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === 'APPROVED') return <Badge className="bg-[#e6f4ea] text-[#188038]">Approved</Badge>;
  if (status === 'REJECTED') return <Badge className="bg-google-bg text-google-muted">Rejected</Badge>;
  return <Badge className="bg-[#fef7e0] text-[#b06000]">Recommended</Badge>;
}

function leftZero(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}m`;
}