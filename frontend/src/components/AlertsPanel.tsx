import { AlertTriangle, BellRing, Siren, Info, ArrowRight } from 'lucide-react';
import type { Alert } from '../types';
import { Panel } from './Panel';

const META: Record<string, { icon: typeof Siren; bg: string; text: string }> = {
  emergency: { icon: Siren, bg: '#fce8e6', text: '#d93025' },
  critical: { icon: AlertTriangle, bg: '#fef7e0', text: '#e37400' },
  warning: { icon: BellRing, bg: '#fef7e0', text: '#b06000' },
  info: { icon: Info, bg: '#e8f0fe', text: '#1a73e8' },
};

export function AlertsPanel({
  alerts,
  onSelectSection,
}: {
  alerts: Alert[];
  onSelectSection?: (sectionId: string) => void;
}) {
  return (
    <Panel
      title="Alerts"
      subtitle="Issues needing attention right now"
      icon={<Siren className="w-4 h-4" />}
    >
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {alerts.length === 0 && (
          <p className="text-sm text-google-muted py-2">No active alerts.</p>
        )}
        {alerts.map((a) => {
          const m = META[a.severity] ?? META.info;
          const Icon = m.icon;
          return (
            <div
              key={a.alert_id}
              className="rounded-lg border border-google-softline p-2.5 text-[12.5px] leading-snug"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: m.bg, color: m.text }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span
                  className="font-medium capitalize"
                  style={{ color: m.text }}
                >
                  {a.kind.replace(/_/g, ' ')}
                </span>
                <span className="ml-auto text-[10px] uppercase text-google-muted">
                  {a.severity}
                </span>
              </div>
              <p className="text-google-gray mt-1.5">{a.message}</p>
              <button
                onClick={() => onSelectSection?.(a.section_id)}
                className="mt-1.5 text-google-blue flex items-center gap-1 text-[12px] font-medium hover:underline"
              >
                {a.action}
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}