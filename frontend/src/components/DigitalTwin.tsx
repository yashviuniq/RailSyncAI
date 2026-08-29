import type { Section, Station, Task } from '../types';
import { Badge } from './Panel';

function HealthBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 text-slate-500">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="w-8 text-right font-medium text-slate-700">{value}%</span>
    </div>
  );
}

export function DigitalTwin({
  stations,
  sections,
  tasks,
  selectedSection,
  onSelect,
}: {
  stations: Station[];
  sections: Section[];
  tasks: Task[];
  selectedSection: string;
  onSelect: (id: string) => void;
}) {
  const trafficColor = (v: string) =>
    v === 'VERY_HIGH' ? '#dc2626' : v === 'HIGH' ? '#f97316' : v === 'MEDIUM' ? '#eab308' : '#22c55e';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 overflow-x-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-800">Railway Corridor — Digital Twin</h2>
        <Badge className="bg-slate-100 text-slate-600">Schematic · prototype data</Badge>
      </div>

      <div className="flex items-center min-w-[900px]">
        {stations.map((st, idx) => (
          <div key={st.id} className="flex items-center">
            {/* station */}
            <button
              onClick={() => onSelect('')}
              className="flex flex-col items-center px-1"
            >
              <div className="w-9 h-9 rounded-full bg-navy-900 bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold shadow">
                {st.id}
              </div>
              <span className="text-[10px] mt-1 text-slate-600 font-semibold">{st.name}</span>
            </button>
            {idx < stations.length - 1 && (
              /* section */
              (() => {
                const sec = sections[idx];
                const isSel = selectedSection === sec.id;
                const secTasks = tasks.filter((t) => t.section_id === sec.id);
                const crit = secTasks.filter((t) => t.severity === 'CRITICAL').length;
                return (
                  <button
                    onClick={() => onSelect(sec.id)}
                    className={`mx-1 rounded-lg px-3 py-2 text-left transition flex flex-col gap-1 ${
                      isSel ? 'ring-2 ring-slate-800 bg-slate-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 rounded-full relative overflow-hidden flex-1"
                           style={{ background: 'repeating-linear-gradient(90deg,#64748b 0 6px,transparent 6px 10px)' }}>
                        <div className="absolute inset-y-0 left-0 rounded-full"
                             style={{ width: '100%', background: trafficColor(sec.traffic_level), opacity: 0.35 }} />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700">{sec.id}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 flex-wrap">
                      <span>{sec.traffic_level} traffic</span>
                      <span>·</span>
                      <span>{sec.length_km} km</span>
                      <span>·</span>
                      <span className={sec.route_class === 'A' ? 'text-red-600 font-semibold' : ''}>Class {sec.route_class}</span>
                      <span>·</span>
                      <span>{secTasks.length} tasks</span>
                      {crit > 0 && <span className="text-red-600 font-semibold">({crit} critical)</span>}
                    </div>
                    {isSel && (
                      <div className="text-[10px] text-slate-600 border-t border-slate-100 pt-1 mt-0.5">
                        <HealthBar label="Track" value={sec.track_health} color="#1e40af" />
                        <HealthBar label="OHE" value={sec.ohe_health} color="#f97316" />
                        <HealthBar label="Signal" value={sec.signal_health} color="#059669" />
                      </div>
                    )}
                  </button>
                );
              })()
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
