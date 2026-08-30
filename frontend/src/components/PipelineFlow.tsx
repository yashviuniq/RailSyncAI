import {
  Database,
  BrainCircuit,
  Clock3,
  PackageCheck,
  GitMerge,
  CalendarCheck2,
  RefreshCcw,
  ChevronRight,
} from 'lucide-react';

const STEPS: { label: string; icon: typeof Database; sub: string }[] = [
  { label: 'Railway data', icon: Database, sub: 'TMS · SMMS · TDMS · COA' },
  { label: 'Risk scored', icon: BrainCircuit, sub: 'explainable 0–100' },
  { label: 'Free windows', icon: Clock3, sub: 'low-traffic slots' },
  { label: 'Opportunities', icon: PackageCheck, sub: 'bundled tasks' },
  { label: 'Multi-dept blocks', icon: GitMerge, sub: 'one coordinated block' },
  { label: 'Optimized plan', icon: CalendarCheck2, sub: 'risk-weighted' },
  { label: 'Auto replan', icon: RefreshCcw, sub: 'when conditions change' },
];

export function PipelineFlow() {
  return (
    <div className="g-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[13px] font-medium text-google-ink">How it works</span>
        <span className="text-[12px] text-google-muted">
          Every available railway window becomes the maximum safe &amp; valuable maintenance
        </span>
      </div>
      <div className="flex items-stretch gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center gap-1 shrink-0">
              <div className="flex flex-col items-center text-center w-[118px] px-1 py-2 rounded-lg hover:bg-google-bg transition">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 ${
                    i < 2
                      ? 'bg-[#e8f0fe] text-google-blue'
                      : i < 5
                        ? 'bg-[#e6f4ea] text-google-green-dark'
                        : 'bg-[#fef7e0] text-[#b06000]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <p className="text-[11px] font-medium text-google-ink leading-tight">{s.label}</p>
                <p className="text-[10px] text-google-muted leading-tight mt-0.5">{s.sub}</p>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-google-line shrink-0 -ml-1" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}