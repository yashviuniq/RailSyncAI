import type { Plan } from '../types';
import { fmtTime, DEPT_COLORS } from '../utils';
import { Badge } from './Panel';

const HOURS = 24;
const MINUTE_W = 1.5; // px per minute

function parseMinute(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export function WeeklyGantt({ plan }: { plan: Plan }) {
  const sections = Array.from(new Set(plan.blocks.map((b) => b.section_id))).sort();
  const totalMin = HOURS * 60;
  const width = totalMin * MINUTE_W;

  // Filter blocks to those within 00:00-24:00 (our engine schedules day-only)
  const blocks = plan.blocks;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 overflow-x-auto">
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-lg font-semibold text-slate-800">Weekly Block Plan</h2>
        <Badge className="bg-slate-100 text-slate-600">
          {plan.start} → {plan.end}
        </Badge>
      </div>

      {/* time axis */}
      <div className="relative ml-24 mb-1" style={{ width }}>
        {Array.from({ length: HOURS }, (_, h) => (
          <span
            key={h}
            className="absolute text-[10px] text-slate-400"
            style={{ left: h * 60 * MINUTE_W }}
          >
            {h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}
          </span>
        ))}
      </div>

      {sections.map((sec) => (
        <div key={sec} className="flex items-center mb-2">
          <div className="w-24 shrink-0 text-sm font-semibold text-slate-700">{sec}</div>
          <div className="relative rounded bg-slate-50 h-10" style={{ width }}>
            {/* gridlines each hour */}
            {Array.from({ length: HOURS + 1 }, (_, h) => (
              <div
                key={h}
                className="absolute top-0 bottom-0 w-px bg-slate-200"
                style={{ left: h * 60 * MINUTE_W }}
              />
            ))}
            {blocks
              .filter((b) => b.section_id === sec)
              .map((b) => {
                const start = parseMinute(b.start);
                const end = parseMinute(b.end);
                const w = Math.max(8, (end - start) * MINUTE_W);
                const deptKeys = Array.from(new Set(b.departments));
                const color =
                  deptKeys.length > 1
                    ? 'linear-gradient(90deg,#1e40af,#059669,#f97316)'
                    : DEPT_COLORS[deptKeys[0]] ?? '#64748b';
                return (
                  <div
                    key={b.block_id}
                    className="absolute top-1 bottom-1 rounded-md px-1.5 flex items-center overflow-hidden shadow-sm"
                    style={{ left: start * MINUTE_W, width: w, background: color }}
                    title={`${b.block_id}: ${deptKeys.join(' + ')} · ${fmtTime(b.start)}-${fmtTime(b.end)} · ${b.tasks.length} tasks`}
                  >
                    {w > 40 && (
                      <span className="text-[10px] text-white font-medium truncate">
                        {deptKeys.join('+')} · {leftZero((end - start))}
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: DEPT_COLORS['Engineering'] }} /> Engineering
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: DEPT_COLORS["S&T"] }} /> S&T
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: DEPT_COLORS['Electrical'] }} /> Electrical
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded"
               style={{ background: 'linear-gradient(90deg,#1e40af,#059669,#f97316)' }} /> Coordinated (multi-dept)
        </span>
      </div>
    </div>
  );
}

function leftZero(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}m`;
}
