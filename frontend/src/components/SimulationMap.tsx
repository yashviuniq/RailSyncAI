import { useEffect, useMemo, useState } from 'react';
import { Play, Pause, RotateCcw, Clock, Wrench } from 'lucide-react';
import type { Station, Section, Task, Block, Snapshot } from '../types';
import { fmtClock } from '../utils';

const MIN_OF_DAY = 24 * 60;

type ProblemState = 'FOUND' | 'UNDER_WORK' | 'SOLVED';

interface ProblemSummary {
  found: number;
  underWork: number;
  solved: number;
  samples: { state: ProblemState; task: Task }[];
}

function summarize(sectionId: string, tasks: Task[], blocks: Block[]): ProblemSummary {
  const secTasks = tasks.filter((t) => t.section_id === sectionId);
  // Blocks currently expressed as scheduling activity -> derive "under work" from IN_PROGRESS
  const hasActiveBlock = blocks.some(
    (b) => b.section_id === sectionId && b.status === 'ACTIVE',
  );
  const found: { state: ProblemState; task: Task }[] = [];
  const underWork: { state: ProblemState; task: Task }[] = [];
  const solved: { state: ProblemState; task: Task }[] = [];

  for (const t of secTasks) {
    if (t.status === 'COMPLETED') {
      solved.push({ state: 'SOLVED', task: t });
    } else if (t.status === 'IN_PROGRESS' || hasActiveBlock) {
      underWork.push({ state: 'UNDER_WORK', task: t });
    } else {
      // OPEN / PLANNED / SCHEDULED / DEFERRED -> pending -> "found"
      found.push({ state: 'FOUND', task: t });
    }
  }

  // ensure at least one "under work" tag when a block is active even without tasks
  if (hasActiveBlock && underWork.length === 0) {
    underWork.push({
      state: 'UNDER_WORK',
      task: {
        task_id: 'block-active',
        source_system: 'BDMS',
        department: 'Engineering',
        section_id: sectionId,
        section_name: '',
        location_km: 0,
        asset: 'Section',
        defect_type: 'Maintenance block in progress',
        severity: 'HIGH',
        detected_date: '',
        due_date: '',
        estimated_minutes: 0,
        status: 'IN_PROGRESS',
        risk_score: 0,
        risk_factors: {},
        description: 'Scheduled maintenance currently underway',
      },
    });
  }

  return {
    found: found.length,
    underWork: underWork.length,
    solved: solved.length,
    samples: [...found, ...underWork, ...solved],
  };
}

const STATE_META: Record<ProblemState, { label: string; color: string; glow: string }> = {
  FOUND: { label: 'Problem found', color: '#d93025', glow: 'rgba(217,48,37,0.45)' },
  UNDER_WORK: { label: 'Under work', color: '#f9ab00', glow: 'rgba(249,171,0,0.5)' },
  SOLVED: { label: 'Solved', color: '#188038', glow: 'rgba(24,128,56,0.35)' },
};

export function SimulationMap({
  stations,
  sections,
  tasks,
  trains,
  blocks,
  selectedSection,
  onSelect,
}: {
  stations: Station[];
  sections: Section[];
  tasks: Task[];
  trains: Snapshot['trains'];
  blocks: Block[];
  selectedSection: string;
  onSelect: (id: string) => void;
}) {
  const [now, setNow] = useState(6 * 60); // start at 06:00
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(90); // sim-minutes per wall second

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setNow((n) => (n + 0.5 * speed) % MIN_OF_DAY);
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing, speed]);

  // ---- geometry ----
  const W = 940;
  const H = 300;
  const PAD_X = 90;
  const gap = (W - PAD_X * 2) / Math.max(1, stations.length - 1);
  const stationX = new Map<string, number>(
    stations.map((s, i) => [s.id, PAD_X + i * gap]),
  );
  const secIndex = new Map(sections.map((s, i) => [s.id, i]));

  const summaries = useMemo(
    () => new Map(sections.map((s) => [s.id, summarize(s.id, tasks, blocks)])),
    [sections, tasks, blocks],
  );

  // trains positioned along the corridor based on sim clock + entry time
  const trainPositions = useMemo(() => {
    return trains
      .filter((t) => t.sections.length > 0)
      .map((t) => {
        const path = t.sections; // ordered contiguous sections
        const dirSign = t.direction === 'UP' ? 1 : -1;
        const entry = t.entry_minute;
        const travelPerSectionMin = 45; // ~ approx travel time per block
        const totalMin = path.length * travelPerSectionMin;
        const progress = ((now - entry + MIN_OF_DAY) % MIN_OF_DAY) / totalMin;
        return { train: t, progress, path, dirSign, travelPerSectionMin };
      });
  }, [trains, now]);

  return (
    <div className="space-y-3">
      {/* Simulation clock / transport controls */}
      <SimClock now={now} playing={playing} speed={speed} setSpeed={setSpeed} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onReset={() => setNow(6 * 60)} onSeek={(m) => setNow(m)} />

      {/* Corridor map */}
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[880px] h-auto select-none">
          {/* section lines + animation lanes */}
          {sections.map((sec) => {
            const i = secIndex.get(sec.id) ?? 0;
            const lane = i % 2;
            const a = sec.station_a;
            const b = sec.station_b;
            const x1 = stationX.get(a)!;
            const x2 = stationX.get(b)!;
            const active = selectedSection === sec.id;
            const y = H / 2;

            return (
              <g key={sec.id} onClick={() => onSelect(sec.id)} className="cursor-pointer">
                <line
                  x1={x1} y1={y} x2={x2} y2={y}
                  stroke={active ? '#1a73e8' : '#dadce0'}
                  strokeWidth={active ? 5 : 3}
                />
                {/* track lanes */}
                <line x1={x1 + 4} y1={y + 14 * (lane === 0 ? -1 : 1)} x2={x2 - 4} y2={y + 14 * (lane === 0 ? -1 : 1)} stroke="#fbbc04" strokeWidth={1.5} strokeDasharray="6 4" opacity={active ? 1 : 0.6} />
                <text x={(x1 + x2) / 2} y={y - 26} textAnchor="middle" fontSize="12" fontWeight="600" fill={active ? '#1a73e8' : '#5f6368'}>
                  {sec.name} · {sec.length_km} km
                </text>
              </g>
            );
          })}

          {/* dragging trains */}
          {trainPositions.map((tp) => {
            const { train, path, dirSign, progress } = tp;
            // determine which section the train is on and fractional offset
            const world = progress * path.length;
            const segIdx = Math.min(path.length - 1, Math.floor(world));
            const fracInSeg = world - segIdx;
            const sec = path[segIdx];
            const a = sections.find((s) => s.id === sec)?.station_a;
            const b = sections.find((s) => s.id === sec)?.station_b;
            if (!a || !b) return null;
            const lane = (secIndex.get(sec) ?? 0) % 2;
            const y = H / 2 + 14 * (lane === 0 ? -1 : 1);
            const x1 = stationX.get(a)!;
            const x2 = stationX.get(b)!;
            const x = dirSign === 1 ? x1 + (x2 - x1) * fracInSeg : x2 - (x2 - x1) * fracInSeg;
            const enteringBlock = blocks.some(
              (bl) => bl.section_id === sec && bl.status === 'ACTIVE',
            );
            return (
              <g key={train.train_number} transform={`translate(${x},${y})`}>
                {enteringBlock && <circle r={9} fill="none" stroke="#d93025" strokeWidth={1} opacity={0.5} />}
                <circle r={5.5} fill={train.train_type === 'GOODS' ? '#5f6368' : '#1a73e8'} stroke="#fff" strokeWidth={1.5} />
                <title>{`${train.train_number} ${train.train_name}${enteringBlock ? '\nHeld: maintenance block ahead' : ''}`}</title>
              </g>
            );
          })}

          {/* direction arrows on lanes */}
          {[0, 1].map((lane) => (
            <line
              key={lane}
              x1={PAD_X + 6} y1={H / 2 + (lane === 0 ? -30 : 30)} x2={W - PAD_X - 6} y2={H / 2 + (lane === 0 ? -30 : 30)}
              stroke="#9aa0a6" strokeWidth={1} strokeDasharray="3 5" opacity={0.6}
            />
          ))}

          {/* stations */}
          {stations.map((st) => (
            <g key={st.id}>
              <rect x={stationX.get(st.id)! - 14} y={H / 2 - 18} width={28} height={36} rx={6} fill="#202124" />
              <text x={stationX.get(st.id)!} y={H / 2 + 5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">{st.id}</text>
              <text x={stationX.get(st.id)!} y={H - 6} textAnchor="middle" fontSize="11" fill="#5f6368" fontWeight="600">{st.name}</text>
            </g>
          ))}
        </svg>
      </div>

      {/* Problem markers per section */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {sections.map((sec) => {
          const s = summaries.get(sec.id)!;
          const active = selectedSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => onSelect(sec.id)}
              className={`rounded-xl border p-3 text-left transition ${active ? 'border-google-blue bg-[#e8f0fe] ring-1 ring-google-blue' : 'border-google-softline hover:bg-google-bg'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-google-ink">{sec.name}</span>
                <span className="text-[10px] uppercase tracking-wide text-google-muted">{sec.length_km} km</span>
              </div>
              <div className="mt-2 space-y-1.5">
                <StateRow state="FOUND" count={s.found} />
                <StateRow state="UNDER_WORK" count={s.underWork} />
                <StateRow state="SOLVED" count={s.solved} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Scheduling timeline */}
      <ScheduleGantt blocks={blocks} now={now} />
    </div>
  );
}

function StateRow({ state, count }: { state: ProblemState; count: number }) {
  const meta = STATE_META[state];
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span
        className="w-2 h-2 rounded-full"
        style={{ background: meta.color, boxShadow: count > 0 ? `0 0 0 3px ${meta.glow}` : 'none' }}
      />
      <span className="text-google-gray">{meta.label}</span>
      <span className="ml-auto font-semibold" style={{ color: meta.color }}>{count}</span>
    </div>
  );
}

function SimClock({
  now,
  playing,
  speed,
  setSpeed,
  onPlay,
  onPause,
  onReset,
  onSeek,
}: {
  now: number;
  playing: boolean;
  speed: number;
  setSpeed: (s: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onSeek: (m: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-google-softline bg-google-white px-3 py-2.5">
      <button onClick={playing ? onPause : onPlay} className="w-9 h-9 rounded-full bg-google-blue text-white flex items-center justify-center hover:opacity-90 transition" title={playing ? 'Pause' : 'Play'}>
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
      <button onClick={onReset} className="w-8 h-8 rounded-full border border-google-softline flex items-center justify-center text-google-gray hover:bg-google-bg transition" title="Reset to 06:00">
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
      <div className="flex items-center gap-1.5 text-google-gray">
        <Clock className="w-4 h-4" />
        <span className="font-mono text-lg font-semibold text-google-ink">{fmtClock(now)}</span>
      </div>
      <input
        type="range" min={0} max={MIN_OF_DAY} value={now} onChange={(e) => onSeek(Number(e.target.value))}
        className="flex-1 min-w-[160px] accent-[#1a73e8]" aria-label="Simulation time"
      />
      <label className="flex items-center gap-1.5 text-[11px] text-google-muted">
        Speed
        <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="border border-google-softline rounded px-1.5 py-0.5 text-[11px]">
          <option value={30}>1×</option>
          <option value={60}>2×</option>
          <option value={90}>3×</option>
          <option value={180}>6×</option>
          <option value={360}>12×</option>
        </select>
      </label>
    </div>
  );
}

function ScheduleGantt({ blocks, now }: { blocks: Block[]; now: number }) {
  if (blocks.length === 0) return null;
  const active = blocks.some((b) => isActive(b, now));
  return (
    <div className="rounded-xl border border-google-softline p-3">
      <div className="flex items-center gap-2 mb-2">
        <Wrench className="w-3.5 h-3.5 text-google-muted" />
        <p className="text-[12px] font-semibold text-google-ink">Scheduled maintenance blocks</p>
        <span className="ml-auto text-[11px] text-google-muted">{active ? '● block active now' : 'no block active at current time'}</span>
      </div>
      <div className="space-y-1.5">
        {blocks
          .filter((b) => !['DRAFT', 'REJECTED'].includes(b.status))
          .slice()
          .sort((a, b) => toMin(a.start) - toMin(b.start))
          .map((b) => {
            const s = toMin(b.start);
            const e = toMin(b.end);
            const status = b.status === 'ACTIVE' ? 'active' : b.status === 'COMPLETED' ? 'solved' : 'planned';
            const color = status === 'active' ? '#f9ab00' : status === 'solved' ? '#188038' : '#1a73e8';
            return (
              <div key={b.block_id} className="flex items-center gap-2 text-[11px]">
                <span className="w-16 text-google-muted font-mono">{fmtClock(s)}</span>
                <div className="relative flex-1 h-3 bg-google-bg rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 rounded-full"
                    style={{
                      left: `${(s / MIN_OF_DAY) * 100}%`,
                      width: `${Math.max(1.5, ((e - s) / MIN_OF_DAY) * 100)}%`,
                      background: color,
                      border: status === 'active' ? '1px solid #b06000' : 'none',
                    }}
                  />
                  <div
                    className="absolute inset-y-0 w-[2px] bg-google-ink/60"
                    style={{ left: `${(now / MIN_OF_DAY) * 100}%` }}
                  />
                </div>
                <span className="w-12 text-right font-medium" style={{ color }}>{fmtClock(e)}</span>
                <span className="w-24 truncate text-google-gray">{b.section_name}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function isActive(b: Block, now: number): boolean {
  return now >= toMin(b.start) && now <= toMin(b.end);
}

function toMin(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}
