import { Map, Activity, Sparkles, AlertTriangle } from 'lucide-react';
import type { Section, Station, Task, Opportunity } from '../types';
import { fmtTime, DEPT_COLORS, trafficColor } from '../utils';
import { Panel, Badge } from './Panel';

export function DigitalTwin({
  stations,
  sections,
  tasks,
  opportunities,
  selectedSection,
  onSelect,
}: {
  stations: Station[];
  sections: Section[];
  tasks: Task[];
  opportunities: Opportunity[];
  selectedSection: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Panel
      title="Railway Corridor — Digital Twin"
      subtitle="Schematic view · click a section for health, workload and the next bundled opportunity"
      icon={<Map className="w-4 h-4" />}
      actions={<Badge className="bg-[#f8f9fa] text-google-muted">schematic · prototype data</Badge>}
    >
      <div className="flex items-center min-w-[880px]">
        {stations.map((st, idx) => (
          <div key={st.id} className="flex items-center">
            {/* station */}
            <div className="flex flex-col items-center px-1">
              <div className="w-10 h-10 rounded-[10px] bg-google-ink text-white flex items-center justify-center text-[10px] font-medium shadow-sm">
                {st.id}
              </div>
              <span className="text-[10px] mt-1 text-google-gray font-medium">{st.name}</span>
            </div>
            {idx < stations.length - 1 && (
              <SectionNode
                key={sections[idx]?.id}
                section={sections[idx]!}
                tasks={tasks.filter((t) => t.section_id === sections[idx]!.id)}
                opportunity={opportunities.find((o) => o.section_id === sections[idx]!.id)}
                isSelected={selectedSection === sections[idx]!.id}
                onSelect={onSelect}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-google-gray items-center">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ background: trafficColor('VERY_HIGH') }} /> Very high traffic
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ background: trafficColor('HIGH') }} /> High
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ background: trafficColor('MEDIUM') }} /> Medium
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ background: trafficColor('LOW') }} /> Low
        </span>
        <span className="ml-auto inline-flex items-center gap-1 text-google-muted">
          <Activity className="w-3.5 h-3.5" /> Track · OHE · Signal health shown on selection
        </span>
      </div>
    </Panel>
  );
}

function HealthBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-14 text-google-gray">{label}</span>
      <div className="flex-1 h-2 bg-google-bg rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="w-8 text-right font-medium text-google-ink">{value}%</span>
    </div>
  );
}

function SectionNode({
  section,
  tasks,
  opportunity,
  isSelected,
  onSelect,
}: {
  section: Section;
  tasks: Task[];
  opportunity?: Opportunity;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const crit = tasks.filter((t) => t.severity === 'CRITICAL').length;
  return (
    <button
      onClick={() => onSelect(section.id)}
      className={`mx-1 rounded-xl px-3 py-2 text-left transition flex flex-col gap-1.5 border ${
        isSelected
          ? 'border-google-blue bg-[#e8f0fe] ring-1 ring-google-blue'
          : 'border-google-softline hover:bg-google-bg'
      }`}
    >
      <div className="flex items-center gap-2">
        {/* track line colored by traffic */}
        <div className="h-1.5 w-20 rounded-full overflow-hidden bg-google-softline">
          <div
            className="h-full rounded-full"
            style={{ width: '100%', background: trafficColor(section.traffic_level) }}
          />
        </div>
        <span className="text-[11px] font-medium text-google-ink">{section.name}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-google-muted flex-wrap">
        <span className="font-medium" style={{ color: trafficColor(section.traffic_level) }}>
          {section.traffic_level} traffic
        </span>
        <span>·</span>
        <span>{section.length_km} km</span>
        <span>·</span>
        <span>Class {section.route_class}</span>
        <span>·</span>
        <span>{tasks.length} tasks</span>
        {crit > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[#d93025] font-semibold">
            <AlertTriangle className="w-3 h-3" /> {crit} critical
          </span>
        )}
      </div>

      {isSelected && (
        <div className="border-t border-google-blue/30 pt-1.5 text-left space-y-2">
          <HealthBar label="Track" value={section.track_health} color="#1a73e8" />
          <HealthBar label="OHE" value={section.ohe_health} color="#f9ab00" />
          <HealthBar label="Signal" value={section.signal_health} color="#188038" />

          {opportunity && (
            <div className="rounded-lg bg-google-white border border-google-softline p-1.5">
              <p className="text-[10px] text-google-muted flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-google-green-dark" />
                Next opportunity {fmtTime(opportunity.start)} – {fmtTime(opportunity.end)}
              </p>
              <p className="text-[10px] font-medium text-google-ink mt-0.5 truncate">
                Recommended: {opportunity.departments.join(' + ')}
              </p>
              <div className="flex gap-1 mt-1">
                {opportunity.departments.map((d) => (
                  <span
                    key={d}
                    className="w-2 h-2 rounded-full"
                    style={{ background: DEPT_COLORS[d] ?? '#80868b' }}
                    title={d}
                  />
                ))}
                <span className="text-[10px] text-google-green-dark font-medium ml-1">
                  Score {opportunity.opportunity_score}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </button>
  );
}