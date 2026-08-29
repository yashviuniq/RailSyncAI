import { useState } from 'react';
import { api } from '../api';
import type { WhatIfResult, Section } from '../types';
import { Panel } from './Panel';
import { fmtTime, priorityClass } from '../utils';

function Delta({ before, after }: { before: number; after: number }) {
  const d = after - before;
  const cls = d > 0 ? 'text-red-600' : d < 0 ? 'text-green-600' : 'text-slate-400';
  return (
    <span className={cls}>
      {before} → <strong>{after}</strong>
    </span>
  );
}

export function WhatIfView({ sections }: { sections: Section[] }) {
  const [section, setSection] = useState('SEC-B');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [mode, setMode] = useState<'defect' | 'goods'>('defect');

  const run = async () => {
    setLoading(true);
    try {
      const r =
        mode === 'defect'
          ? await api.criticalDefect(section)
          : await api.goodsTrain(section, 140);
      setResult(r);
    } finally {
      setLoading(false);
    }
  };

  const cur = result?.comparison.current;
  const alt = result?.comparison.alternative;

  return (
    <Panel
      title="What-If Simulation & Adaptive Replanning"
      subtitle="Model the impact of changing railway conditions and see a re-optimized plan"
    >
      <div className="flex items-end gap-3 flex-wrap mb-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Scenario</label>
          <div className="flex gap-1">
            <button
              onClick={() => { setMode('defect'); setResult(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${mode === 'defect' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              🔴 Critical defect appears
            </button>
            <button
              onClick={() => { setMode('goods'); setResult(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${mode === 'goods' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              🚂 Extra goods train
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Section</label>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white"
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50"
        >
          {loading ? 'Replanning...' : 'Run simulation'}
        </button>
      </div>

      {!result && (
        <p className="text-sm text-slate-400">
          Choose a scenario and a section, then run the simulation to re-optimize the plan and see what changes.
        </p>
      )}

      {result && (
        <div className="space-y-4">
          {mode === 'defect' && result.new_task && (
            <div className="border border-red-200 bg-red-50 rounded-lg p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-red-800">EMERGENCY DEFECT DETECTED</span>
                <span className={`text-xs font-bold rounded px-2 ${priorityClass(result.new_task.risk_score)}`}>
                  {result.new_task.priority} · {Math.round(result.new_task.risk_score)}
                </span>
              </div>
              <p className="text-sm text-red-700 mt-1">{result.new_task.description}</p>
              <p className="text-xs text-red-600 mt-1">
                {result.inserted !== undefined && (
                  <span className="font-semibold">
                    {result.inserted ? '✓ Included in updated plan' : '✗ Not yet scheduled'}
                  </span>
                )}
              </p>
              {result.recommendation && (
                <p className="text-xs text-red-700 mt-1 italic">{result.recommendation}</p>
              )}
            </div>
          )}

          {mode === 'goods' && result.new_train && (
            <div className="border border-slate-300 bg-slate-50 rounded-lg p-3">
              <span className="text-sm font-semibold text-slate-700">
                Extra goods train {result.new_train.train_number} added — occupies section at 02:20
              </span>
            </div>
          )}

          {cur && alt && (
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Block events', a: cur.blocks, b: alt.blocks },
                { label: 'Tasks scheduled', a: cur.tasks, b: alt.tasks },
                { label: 'Combined blocks', a: cur.combined_blocks, b: alt.combined_blocks },
              ].map((row, i) => (
                <div key={i} className="border border-slate-200 rounded-lg p-3">
                  <p className="text-[11px] uppercase text-slate-400 font-medium">{row.label}</p>
                  <p className="text-lg font-semibold text-slate-700 mt-1">
                    <Delta before={row.a} after={row.b} />
                  </p>
                  <p className="text-xs text-slate-400 mt-1">current → new</p>
                </div>
              ))}
            </div>
          )}

          {result.updated_plan && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1.5">Updated weekly plan</p>
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {result.updated_plan.blocks.map((b) => (
                  <div key={b.block_id} className="flex items-center gap-2 text-xs border border-slate-200 rounded px-2 py-1.5">
                    <span className="font-semibold text-slate-700 w-20 truncate">{b.block_id}</span>
                    <span className="text-slate-500 w-16">{b.section_name}</span>
                    <span className="text-slate-500 w-32">{fmtTime(b.start)}–{fmtTime(b.end)}</span>
                    <span className="text-slate-500 flex-1 truncate">{b.departments.join(' + ')}</span>
                    <span className="text-slate-400">{b.tasks.length} tasks</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
