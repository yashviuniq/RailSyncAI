import type { BeforeAfter } from '../types';
import { Panel, Badge } from './Panel';

export function BeforeAfterView({ data }: { data: BeforeAfter }) {
  return (
    <Panel
      title="Before vs After"
      subtitle="Existing decentralized/manual block planning vs the coordinated opportunity-driven approach (synthetic/prototype data)"
    >
      <div className="flex justify-center gap-2 mb-4">
        <Badge className="bg-slate-100 text-slate-600">Existing (BDMS manual)</Badge>
        <span className="text-slate-300">→</span>
        <Badge className="bg-slate-800 text-white">Proposed (AI-coordinated)</Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="py-2 pr-4 text-slate-500 font-medium">Metric</th>
              <th className="py-2 pr-4 text-slate-500 font-medium text-center">Existing</th>
              <th className="py-2 text-slate-500 font-medium text-center">Proposed</th>
              <th className="py-2 pl-4 text-slate-500 font-medium text-center">Improvement</th>
            </tr>
          </thead>
          <tbody>
            {data.metric.map((m, i) => {
              const existing = data.existing[i];
              const proposed = data.proposed[i];
              const improve =
                i === 1
                  ? proposed - existing // combined blocks: higher better
                  : i === 4
                    ? proposed - existing // tasks addressed: higher better
                    : existing - proposed; // others lower better
              const raw = proposed - existing;
              const better =
                i === 1 || i === 4 ? raw > 0 : raw < 0;
              const worse = i === 1 || i === 4 ? raw < 0 : raw > 0;
              return (
                <tr key={m} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-700">{m}</td>
                  <td className="py-2 pr-4 text-center font-semibold text-slate-500">{existing}</td>
                  <td className="py-2 pr-4 text-center font-bold text-slate-800">{proposed}</td>
                  <td className="py-2 pl-4 text-center">
                    {improve !== 0 ? (
                      <span className={better ? 'text-green-600 font-semibold' : worse ? 'text-red-600 font-semibold' : 'text-slate-400'}>
                        {better ? '▲' : worse ? '▼' : '•'} {Math.abs(improve)}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
