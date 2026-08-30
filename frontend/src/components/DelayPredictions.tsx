import { LineChart, TrainFront } from 'lucide-react';
import type { DelayPrediction } from '../types';
import { fmtClock } from '../utils';
import { Panel, Badge } from './Panel';

export function DelayPredictions({ predictions }: { predictions: DelayPrediction[] }) {
  return (
    <Panel
      title="Delay prediction"
      subtitle="Forecast train delays for today (synthetic)"
      icon={<LineChart className="w-4 h-4" />}
    >
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {predictions.length === 0 && (
          <p className="text-sm text-google-muted py-2">No predictions.</p>
        )}
        {predictions.map((p) => {
          const bad = p.predicted_delay_min >= 12;
          return (
            <div key={p.train_number} className="rounded-lg border border-google-softline p-2.5">
              <div className="flex items-center gap-2">
                <TrainFront className="w-4 h-4 text-google-muted shrink-0" />
                <span className="text-[13px] font-medium text-google-ink">
                  {p.train_number}
                </span>
                <span className="text-[11px] text-google-muted truncate">{p.train_name}</span>
                <span className="ml-auto flex items-center gap-2">
                  <span className="text-[11px] text-google-muted">{fmtClock(p.entry_minute)}</span>
                  <Badge
                    className={bad ? 'bg-[#fce8e6] text-[#d93025]' : 'bg-[#e6f4ea] text-[#188038]'}
                  >
                    +{p.predicted_delay_min} min
                  </Badge>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-google-bg overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (p.predicted_delay_min / 30) * 100)}%`,
                    background: bad ? '#d93025' : '#34a853',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}