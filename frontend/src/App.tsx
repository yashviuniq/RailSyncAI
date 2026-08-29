import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import type { Snapshot } from './types';
import { KpiPanel } from './components/KpiPanel';
import { DigitalTwin } from './components/DigitalTwin';
import { WeeklyGantt } from './components/WeeklyGantt';
import { Opportunities } from './components/Opportunities';
import { Tasks } from './components/Tasks';
import { BeforeAfterView } from './components/BeforeAfterView';
import { WhatIfView } from './components/WhatIfView';
import { MonthlyView } from './components/MonthlyView';

type Tab = 'overview' | 'weekly' | 'monthly' | 'whatif';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'weekly', label: 'Weekly Plan' },
  { id: 'monthly', label: 'Monthly Plan' },
  { id: 'whatif', label: 'What-If / Replan' },
];

export default function App() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedSection, setSelectedSection] = useState('SEC-B');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const refreshKey = useRef(0);

  const load = async () => {
    const key = ++refreshKey.current;
    setRefreshing(true);
    try {
      const s = await api.snapshot();
      if (key === refreshKey.current) setSnap(s);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (key === refreshKey.current) setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded-xl shadow p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-slate-800">Backend not reachable</h1>
          <p className="text-sm text-slate-500 mt-2">
            Please start the FastAPI backend first:
          </p>
          <pre className="text-xs bg-slate-50 border rounded p-3 mt-3 text-left font-mono">
            cd backend{'\n'}python run.py
          </pre>
          <p className="text-xs text-red-600 mt-3">{error}</p>
        </div>
      </div>
    );
  }

  if (!snap) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-400">Loading railway orchestrator...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              🚆 Railway Maintenance Orchestrator
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              AI-powered automatic block planning to maximize asset availability · Prototype (synthetic data)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Plan week of {snap.reference_date}</span>
            <button
              onClick={load}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium transition"
            >
              {refreshing ? 'Refreshing…' : '⟳ Refresh'}
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 flex gap-1 pb-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                tab === t.id
                  ? 'border-white text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {tab === 'overview' && (
          <>
            <KpiPanel kpis={snap.kpis} />
            <DigitalTwin
              stations={snap.network.stations}
              sections={snap.network.sections}
              tasks={snap.tasks}
              selectedSection={selectedSection}
              onSelect={setSelectedSection}
            />
            <Opportunities opportunities={snap.opportunities} />
          </>
        )}

        {tab === 'weekly' && (
          <div className="space-y-6">
            <WeeklyGantt plan={snap.weekly_plan} />
            <Tasks tasks={snap.tasks} />
            <BeforeAfterView data={snap.before_after} />
          </div>
        )}

        {tab === 'monthly' && <MonthlyView plan={snap.monthly_plan} />}

        {tab === 'whatif' && (
          <WhatIfView sections={snap.network.sections} />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        Railway Maintenance Orchestrator · SIH prototype · Synthetic data · Decision-support engine, not autonomous
      </footer>
    </div>
  );
}
