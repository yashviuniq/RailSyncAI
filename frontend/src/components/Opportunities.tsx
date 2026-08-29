import type { Opportunity } from '../types';
import { fmtTime, DEPT_COLORS, SEVERITY_COLORS } from '../utils';
import { Panel, Badge } from './Panel';

export function Opportunities({ opportunities }: { opportunities: Opportunity[] }) {
  return (
    <Panel
      title="Maintenance Opportunities"
      subtitle="Low-traffic railway windows where compatible multi-department work can be bundled into one coordinated block"
    >
      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
        {opportunities.length === 0 && (
          <p className="text-slate-400 text-sm">No opportunities found.</p>
        )}
        {opportunities.map((o) => (
          <div key={o.opportunity_id} className="border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">{o.opportunity_id}</span>
                <Badge className="bg-slate-800 text-white">{o.section_name}</Badge>
                <span className="text-xs text-slate-500">
                  {fmtTime(o.start)} – {fmtTime(o.end)} ({o.available_window_minutes}m window)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {o.departments.map((d) => (
                    <span
                      key={d}
                      className="w-2 h-2 rounded-full"
                      style={{ background: DEPT_COLORS[d] ?? '#888' }}
                      title={d}
                    />
                  ))}
                </div>
                <span className="text-sm font-bold" style={{ color: scoreColor(o.opportunity_score) }}>
                  Score {o.opportunity_score}
                </span>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {o.tasks.map((t) => (
                <span
                  key={t.task_id}
                  className="inline-flex items-center gap-1.5 text-xs rounded border border-slate-200 px-1.5 py-0.5"
                  style={{ borderColor: `${SEVERITY_COLORS[t.severity]}55` }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: SEVERITY_COLORS[t.severity] }}
                  />
                  <span className="font-medium text-slate-700">{t.task_id}</span>
                  <span className="text-slate-500">{t.defect_type}</span>
                  <span className="text-slate-400">{t.department}</span>
                </span>
              ))}
            </div>

            {o.reasons.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-blue-700 font-medium cursor-pointer hover:underline">
                  Why? (recommendation rationale)
                </summary>
                <ul className="mt-1 ml-1 text-xs text-slate-600 list-disc pl-4 space-y-0.5">
                  {o.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function scoreColor(s: number): string {
  if (s >= 80) return '#059669';
  if (s >= 60) return '#1e40af';
  if (s >= 40) return '#f97316';
  return '#64748b';
}
