import { useMemo, useState } from 'react';
import {
  FlaskConical,
  AlertTriangle,
  Truck,
  Users,
  Ban,
  TimerReset,
  CheckCircle2,
  XCircle,
  MoveRight,
  ArrowRight,
  Lightbulb,
} from 'lucide-react';
import { api } from '../api';
import type { WhatIfResult, Section, Plan, Task } from '../types';
import { fmtTime, fmtMinutes, fmtClock, priorityClass, DEPT_COLORS } from '../utils';
import { Panel, Badge } from './Panel';

type Scenario = 'defect' | 'goods' | 'crew' | 'cancel' | 'extend';

const SCENARIOS: { id: Scenario; label: string; icon: typeof AlertTriangle; desc: string; tone: string }[] = [
  { id: 'defect', label: 'Critical defect', icon: AlertTriangle, desc: 'An emergency track defect appears tomorrow', tone: '#d93025' },
  { id: 'goods', label: 'Goods train added', icon: Truck, desc: 'A forecast goods train suddenly occupies a section', tone: '#1a73e8' },
  { id: 'crew', label: 'Crew unavailable', icon: Users, desc: 'A crew member goes off the roster for the day', tone: '#f9ab00' },
  { id: 'cancel', label: 'Cancel a block', icon: Ban, desc: 'Planner withdraws one approved block', tone: '#80868b' },
  { id: 'extend', label: 'Extend a block', icon: TimerReset, desc: 'Planner asks for +30 min on a block', tone: '#188038' },
];

function TimeToMinute(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function WhatIfView({
  sections,
  plan,
  canPlan,
}: {
  sections: Section[];
  plan: Plan;
  canPlan: boolean;
}) {
  const [scenario, setScenario] = useState<Scenario>('defect');
  const [section, setSection] = useState('SEC-B');
  const [dept, setDept] = useState('Electrical');
  const [blockId, setBlockId] = useState(plan.blocks[0]?.block_id ?? '');
  const [extendMin, setExtendMin] = useState(60);
  const [entryTime, setEntryTime] = useState('02:20');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WhatIfResult | null>(null);

  const blocks = useMemo(() => plan.blocks, [plan]);

  if (!canPlan) {
    return (
      <Panel title="What-If Simulation & Adaptive Replanning" icon={<FlaskConical className="w-4 h-4" />}>
        <p className="text-sm text-google-muted">
          This tab is reserved for the Railway Planner and Admin roles.
        </p>
      </Panel>
    );
  }

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      let r: WhatIfResult;
      if (scenario === 'defect') r = await api.criticalDefect(section);
      else if (scenario === 'goods') r = await api.goodsTrain(section, TimeToMinute(entryTime));
      else if (scenario === 'crew') r = await api.crewUnavailable(dept);
      else if (scenario === 'cancel') r = await api.cancelBlock(blockId);
      else r = await api.extendBlock(blockId, extendMin);
      setResult(r);
    } finally {
      setLoading(false);
    }
  };

  const cur = result?.comparison?.current;
  const alt = result?.comparison?.alternative;

  return (
    <Panel
      title="What-If Simulation & Adaptive Replanning"
      subtitle="Model any change in railway conditions, watch the engine re-optimize and understand exactly why the plan changed"
      icon={<FlaskConical className="w-4 h-4" />}
    >
      {/* scenario selector */}
      <div className="flex gap-2 flex-wrap mb-4">
        {SCENARIOS.map((s) => {
          const Icon = s.icon;
          const active = scenario === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setScenario(s.id)}
              className={`g-chip ${active ? 'g-chip-active' : ''}`}
              style={active ? { borderColor: s.tone, color: s.tone, background: '#ffffff' } : undefined}
            >
              <Icon className="w-4 h-4" />
              {s.label}
            </button>
          );
        })}
      </div>

      <p className="text-[12.5px] text-google-gray mb-3">
        {SCENARIOS.find((s) => s.id === scenario)?.desc}
      </p>

      {/* scenario controls */}
      <div className="flex items-end gap-3 flex-wrap mb-4">
        {(scenario === 'defect' || scenario === 'goods') && (
          <Field label="Section">
            <select value={section} onChange={(e) => setSection(e.target.value)} className="g-input">
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        {scenario === 'goods' && (
          <Field label="Entry time">
            <input
              type="time"
              value={entryTime}
              onChange={(e) => setEntryTime(e.target.value)}
              className="g-input"
            />
          </Field>
        )}

        {scenario === 'crew' && (
          <Field label="Department losing a crew">
            <select value={dept} onChange={(e) => setDept(e.target.value)} className="g-input">
              {['Engineering', 'S&T', 'Electrical'].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
        )}

        {(scenario === 'cancel' || scenario === 'extend') && (
          <Field label="Block">
            <select value={blockId} onChange={(e) => setBlockId(e.target.value)} className="g-input min-w-[220px]">
              {blocks.map((b) => (
                <option key={b.block_id} value={b.block_id}>
                  {b.block_id} · {b.section_name} · {fmtTime(b.start)}–{fmtTime(b.end)}
                </option>
              ))}
            </select>
          </Field>
        )}

        {scenario === 'extend' && (
          <Field label="Extension">
            <select
              value={extendMin}
              onChange={(e) => setExtendMin(Number(e.target.value))}
              className="g-input"
            >
              {[15, 30, 45, 60, 90].map((m) => (
                <option key={m} value={m}>
                  +{m} minutes
                </option>
              ))}
            </select>
          </Field>
        )}

        <button onClick={run} disabled={loading} className="g-btn">
          {loading ? 'Replanning…' : 'Run simulation'}
        </button>
      </div>

      {!result && (
        <div className="rounded-xl border border-google-softline bg-google-bg p-5 text-center">
          <p className="text-sm text-google-gray">
            Choose a scenario and press <strong>Run simulation</strong>. The engine re-runs the risk →
            window → bundle → optimize pipeline and compares it against the current plan.
          </p>
        </div>
      )}

      {result?.error && (
        <div className="rounded-xl border border-[#fce8e6] bg-[#fce8e6] p-3 text-sm text-[#d93025]">
          {result.error}
        </div>
      )}

      {result && !result.error && (
        <div className="space-y-4">
          {/* scenario banner */}
          <ScenarioBanner result={result} scenario={scenario} />

          {/* recommendation */}
          {result.recommendation && (
            <div className="rounded-xl border border-[#e8f0fe] bg-[#e8f0fe] p-3 text-[13px] flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-google-blue shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-google-blue-dark">Recommendation</p>
                <p className="text-google-gray mt-0.5">{result.recommendation}</p>
              </div>
            </div>
          )}

          {/* comparison */}
          {cur && alt && (
            <div className="grid sm:grid-cols-3 gap-3">
              <PlanSummaryCard label="CURRENT PLAN" summary={cur} tone="#5f6368" />
              <PlanSummaryCard label="ALTERNATIVE PLAN" summary={alt} tone="#1a73e8" recommended />
              <div className="rounded-xl border border-google-softline p-3.5">
                <p className="text-[11px] uppercase tracking-wide text-google-muted font-medium mb-2">
                  What changed
                </p>
                <div className="space-y-1.5 text-[13px]">
                  <DeltaRow label="Blocks" before={cur.blocks} after={alt.blocks} lowerIsBetter />
                  <DeltaRow label="Tasks completed" before={cur.tasks} after={alt.tasks} lowerIsBetter={false} />
                  <DeltaRow label="Combined blocks" before={cur.combined_blocks} after={alt.combined_blocks} lowerIsBetter={false} />
                  <DeltaRow label="Train impact (min)" before={cur.train_impact_min} after={alt.train_impact_min} lowerIsBetter />
                  <DeltaRow label="Block time (min)" before={cur.total_block_min} after={alt.total_block_min} lowerIsBetter={false} />
                </div>
              </div>
            </div>
          )}

          {/* defect specifics */}
          {result.new_task && (
            <div className="rounded-xl border border-[#fce8e6] bg-google-white p-3.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[13px] font-medium text-[#d93025]">
                  <AlertTriangle className="w-4 h-4" /> Emergency defect injected
                </span>
                <span className={`text-[12px] font-medium rounded-full px-2.5 py-0.5 ${priorityClass(result.new_task.risk_score)}`}>
                  {result.new_task.priority} · {Math.round(result.new_task.risk_score)}
                </span>
                {result.inserted && (
                  <Badge className="bg-[#e6f4ea] text-[#188038]">
                    <CheckCircle2 className="w-3 h-3" /> inserted into updated plan
                  </Badge>
                )}
              </div>
              <p className="text-[13px] text-google-gray mt-1.5">
                {result.new_task.description} · {result.new_task.estimated_minutes} min ·{' '}
                {result.new_task.section_name}
              </p>
            </div>
          )}

          {/* cancel specifics */}
          {result.cancelled_block && (
            <div className="rounded-xl border border-google-softline bg-google-white p-3.5">
              <p className="text-[13px] font-medium text-google-ink flex items-center gap-1.5">
                <Ban className="w-4 h-4 text-google-muted" />
                {result.cancelled_block.block_id} withdrawn —{' '}
                {result.backlog_increase} task(s) postponed, backlog risk +{result.risk_increase} pts
              </p>
            </div>
          )}

          {/* extend specifics */}
          {typeof result.extension_minutes === 'number' && (
            <div className="rounded-xl border border-google-softline bg-google-white p-3.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-medium text-google-ink">
                  +{result.extension_minutes} min extension on {result.block?.block_id}
                </span>
                {result.recommended ? (
                  <Badge className="bg-[#e6f4ea] text-[#188038]">
                    <CheckCircle2 className="w-3 h-3" /> extension recommended
                  </Badge>
                ) : (
                  <Badge className="bg-[#fce8e6] text-[#d93025]">
                    <XCircle className="w-3 h-3" /> extension not worthwhile
                  </Badge>
                )}
              </div>
              <p className="text-[12.5px] text-google-gray mt-1.5">
                {result.message} Additional impact: ~{result.additional_trains_impacted} train(s).
              </p>
              {result.additional_tasks && result.additional_tasks.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {result.additional_tasks.map((t) => (
                    <span key={t.task_id} className="rounded-full border border-google-softline px-2 py-0.5 text-[11px] text-google-gray">
                      {t.task_id} · {t.defect_type} · {t.estimated_minutes}m
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* moved / deferred work */}
          {(result.deferred_tasks?.length || result.comparison?.moved_tasks?.length || result.moved_tasks?.length) ? (
            <MovedTaskList
              tasks={result.deferred_tasks ?? result.moved_tasks ?? result.comparison?.moved_tasks ?? []}
            />
          ) : null}

          {/* updated plan */}
          {result.updated_plan && <UpdatedPlan blocks={result.updated_plan.blocks} />}
        </div>
      )}
    </Panel>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] text-google-muted mb-1 font-medium">{label}</label>
      {children}
    </div>
  );
}

function PlanSummaryCard({
  label,
  summary,
  tone,
  recommended,
}: {
  label: string;
  summary: { blocks: number; tasks: number; combined_blocks: number; train_impact_min: number; total_block_min: number };
  tone: string;
  recommended?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3.5 ${recommended ? '' : ''}`}
      style={{ borderColor: recommended ? '#1a73e8' : '#dadce0', background: recommended ? '#f8fbff' : '#ffffff' }}
    >
      <p className="text-[11px] uppercase tracking-wide font-medium mb-2" style={{ color: tone }}>
        {label}
      </p>
      <div className="grid grid-cols-2 gap-2 text-[13px]">
        <Metric label="Blocks" value={summary.blocks} />
        <Metric label="Tasks" value={summary.tasks} />
        <Metric label="Combined" value={summary.combined_blocks} />
        <Metric label="Delay (min)" value={summary.train_impact_min} />
      </div>
      <p className="text-[11px] text-google-muted mt-2">{fmtMinutes(summary.total_block_min)} total block time</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-google-muted">{label}</p>
      <p className="text-lg font-medium text-google-ink leading-tight">{value}</p>
    </div>
  );
}

function DeltaRow({ label, before, after, lowerIsBetter }: { label: string; before: number; after: number; lowerIsBetter: boolean }) {
  const better = lowerIsBetter ? after < before : after > before;
  const same = after === before;
  return (
    <div className="flex items-center gap-2 text-[12.5px]">
      <span className="text-google-gray flex-1">{label}</span>
      <span className="font-medium text-google-gray text-right">{before}</span>
      <MoveRight className="w-3.5 h-3.5 text-google-muted shrink-0" />
      <span className={`font-medium w-6 text-right ${same ? 'text-google-gray' : better ? 'text-[#188038]' : 'text-[#d93025]'}`}>
        {after}
      </span>
      {!same && (
        <span className={`text-[11px] font-medium ${better ? 'text-[#188038]' : 'text-[#d93025]'}`}>
          {better ? '▲ good' : '▼ bad'}
        </span>
      )}
    </div>
  );
}

function ScenarioBanner({ result, scenario }: { result: WhatIfResult; scenario: Scenario }) {
  let message = '';
  let tone = '#5f6368';
  let bg = '#f8f9fa';
  if (scenario === 'defect' && result.new_task) {
    message = `Critical defect '${result.new_task.defect_type}' on ${result.new_task.section_name} — the engine re-planned to insert emergency work.`;
    tone = '#d93025'; bg = '#fce8e6';
  } else if (scenario === 'goods' && result.new_train) {
    message = `Extra goods ${result.new_train.train_number} now occupies a section at ${fmtClock(result.new_train.entry_minute)} — maintenance windows re-derived.`;
    tone = '#1a73e8'; bg = '#e8f0fe';
  } else if (scenario === 'crew') {
    message = (result as any).message ?? 'A crew became unavailable — resource constraints tightened.';
    tone = '#b06000'; bg = '#fef7e0';
  } else if (scenario === 'cancel' && result.cancelled_block) {
    message = `${result.cancelled_block.block_id} cancelled on ${result.cancelled_block.section_name} (${fmtTime(result.cancelled_block.start)}–${fmtTime(result.cancelled_block.end)}).`;
    tone = '#5f6368'; bg = '#f8f9fa';
  } else if (scenario === 'extend' && result.block) {
    message = `Test extending ${result.block.block_id} by ${result.extension_minutes} min on ${result.block.section_name}.`;
    tone = '#188038'; bg = '#e6f4ea';
  }
  return (
    <div className="rounded-xl border p-3 text-[13px]" style={{ background: bg, borderColor: tone + '44', color: tone }}>
      <span className="font-medium">PLAN CHANGE DETECTED</span> — {message}
    </div>
  );
}

function MovedTaskList({ tasks }: { tasks: Task[] }) {
  return (
    <div className="rounded-xl border border-google-softline bg-google-white p-3.5">
      <p className="text-[12px] font-medium uppercase tracking-wide text-google-muted mb-2 flex items-center gap-1.5">
        <ArrowRight className="w-4 h-4 text-[#f9ab00]" />
        Work moved / deferred to another window ({tasks.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {tasks.map((t) => (
          <span
            key={t.task_id}
            className="inline-flex items-center gap-1.5 rounded-full border border-google-softline px-2 py-0.5 text-[11px] text-google-gray"
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: DEPT_COLORS[t.department] }} />
            <span className="font-medium text-google-ink">{t.task_id}</span>
            {t.defect_type} · score {Math.round(t.risk_score)}
          </span>
        ))}
      </div>
    </div>
  );
}

function UpdatedPlan({ blocks }: { blocks: Plan['blocks'] }) {
  return (
    <div>
      <p className="text-[12px] font-medium uppercase tracking-wide text-google-muted mb-2">
        Updated plan ({blocks.length} blocks)
      </p>
      <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
        {blocks.map((b) => (
          <div
            key={b.block_id}
            className="flex items-center gap-2 text-[12px] border border-google-softline rounded-lg px-2.5 py-1.5 flex-wrap"
          >
            <span className="font-medium text-google-ink w-20 truncate">{b.block_id}</span>
            <span className="text-google-gray w-16">{b.section_name}</span>
            <span className="text-google-gray w-28">
              {fmtTime(b.start)}–{fmtTime(b.end)}
            </span>
            <span className="text-google-gray flex-1 min-w-28 truncate">{b.departments.join(' + ')}</span>
            <span className="text-google-muted">{b.tasks.length} tasks</span>
            <Badge
              className={
                b.status === 'APPROVED'
                  ? 'bg-[#e6f4ea] text-[#188038]'
                  : b.status === 'REJECTED'
                    ? 'bg-google-bg text-google-muted'
                    : 'bg-[#fef7e0] text-[#b06000]'
              }
            >
              {b.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}