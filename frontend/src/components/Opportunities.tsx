import { useState } from 'react';
import { Sparkles, Clock3, Users, TrainFront, ChevronDown, Info } from 'lucide-react';
import type { Opportunity } from '../types';
import { fmtTime, SEVERITY_COLORS, scoreColor } from '../utils';
import { Panel, Badge } from './Panel';

export function Opportunities({
  opportunities,
  compact = false,
}: {
  opportunities: Opportunity[];
  compact?: boolean;
}) {
  const [openWhy, setOpenWhy] = useState<string | null>(null);
  return (
    <Panel
      title="Maintenance Opportunities"
      subtitle="Low-traffic railway windows where compatible multi-department work is bundled into one coordinated block"
      icon={<Sparkles className="w-4 h-4" />}
      actions={
        compact ? (
          <Badge className="bg-[#e6f4ea] text-[#188038]">
            {opportunities.length} of top opportunities shown
          </Badge>
        ) : undefined
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {opportunities.length === 0 && (
          <p className="text-sm text-google-muted py-2 lg:col-span-2">No opportunities found.</p>
        )}
        {opportunities.map((o) => {
          const inWhy = openWhy === o.opportunity_id;
          const color = scoreColor(o.opportunity_score);
          return (
            <div
              key={o.opportunity_id}
              className="rounded-xl border border-google-softline bg-google-white p-3.5"
            >
              <div className="flex items-start gap-3">
                {/* score ring */}
                <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e8eaed" strokeWidth="3.5" />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke={color}
                      strokeWidth="3.5"
                      strokeDasharray={`${o.opportunity_score}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-[12px] font-medium" style={{ color }}>
                    {Math.round(o.opportunity_score)}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13.5px] font-medium text-google-ink">
                      {o.opportunity_id}
                    </span>
                    <Badge className="bg-[#e8f0fe] text-google-blue-dark">{o.section_name}</Badge>
                    <span className="text-[11.5px] text-google-muted">
                      {fmtTime(o.start)} – {fmtTime(o.end)}
                    </span>
                  </div>
                  <p className="text-[12px] text-google-gray mt-1 flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="w-3 h-3 text-google-muted" />
                      {o.available_window_minutes}m window
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3 h-3 text-google-muted" />
                      {o.departments.join(' + ')}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <TrainFront className="w-3 h-3 text-google-muted" />
                      ~{o.train_impact_min} min impact
                    </span>
                  </p>
                </div>
              </div>

              {/* bundled tasks */}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {o.tasks.map((t) => (
                  <span
                    key={t.task_id}
                    className="inline-flex items-center gap-1.5 text-[11px] rounded-full border px-2 py-0.5 bg-google-white"
                    style={{ borderColor: `${SEVERITY_COLORS[t.severity]}55` }}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: SEVERITY_COLORS[t.severity] }}
                    />
                    <span className="font-medium text-google-ink">{t.task_id}</span>
                    <span className="text-google-muted hidden sm:inline">{t.defect_type}</span>
                    <span className="text-google-muted">{t.estimated_minutes}m</span>
                  </span>
                ))}
              </div>

              {/* why */}
              <button
                onClick={() => setOpenWhy(inWhy ? null : o.opportunity_id)}
                className="mt-2.5 flex items-center gap-1 text-[12px] font-medium text-google-blue hover:underline"
              >
                <Info className="w-3.5 h-3.5" />
                {inWhy ? 'Hide rationale' : 'Why this recommendation?'}
                <ChevronDown className={`w-3.5 h-3.5 transition ${inWhy ? 'rotate-180' : ''}`} />
              </button>
              {inWhy && (
                <ul className="mt-2 space-y-1 text-[12px] text-google-gray bg-[#f8f9fa] border border-google-softline rounded-lg p-2.5 list-disc pl-5">
                  {o.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}