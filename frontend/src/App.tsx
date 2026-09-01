import { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Sparkles,
  CalendarDays,
  CalendarRange,
  FlaskConical,
  Scale,
  Bell,
  RefreshCw,
  TrainFront,
  UserCircle,
  Lock,
  ChevronDown,
} from 'lucide-react';
import { api } from './api';
import type { Alert, Role, Snapshot } from './types';
import { KpiPanel } from './components/KpiPanel';
import { AlertsPanel } from './components/AlertsPanel';
import { DigitalTwin } from './components/DigitalTwin';
import { PipelineFlow } from './components/PipelineFlow';
import { DelayPredictions } from './components/DelayPredictions';
import { Opportunities } from './components/Opportunities';
import { Tasks } from './components/Tasks';
import { WeeklyPlan } from './components/WeeklyPlan';
import { MonthlyView } from './components/MonthlyView';
import { WhatIfView } from './components/WhatIfView';
import { CompareView } from './components/CompareView';

type Tab = 'overview' | 'tasks' | 'opportunities' | 'weekly' | 'monthly' | 'whatif' | 'compare';

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard; planOnly: boolean }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, planOnly: false },
  { id: 'tasks', label: 'Tasks & Risk', icon: ClipboardList, planOnly: false },
  { id: 'opportunities', label: 'Opportunities', icon: Sparkles, planOnly: false },
  { id: 'weekly', label: 'Weekly Plan', icon: CalendarDays, planOnly: false },
  { id: 'monthly', label: 'Monthly Plan', icon: CalendarRange, planOnly: false },
  { id: 'whatif', label: 'What-If & Replan', icon: FlaskConical, planOnly: true },
  { id: 'compare', label: 'Compare', icon: Scale, planOnly: false },
];

const ALERT_COLORS: Record<string, string> = {
  emergency: '#d93025',
  critical: '#ea4335',
  warning: '#f9ab00',
  info: '#1a73e8',
};

export default function App() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedSection, setSelectedSection] = useState('SEC-B');
  const [roleId, setRoleId] = useState('admin');
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const refreshKey = useRef(0);

  const load = async () => {
    const key = ++refreshKey.current;
    setRefreshing(true);
    try {
      const s = await api.snapshot();
      if (key === refreshKey.current) {
        setSnap(s);
        setRoleId((r) => (s.roles.some((x) => x.id === r) ? r : s.roles[0].id));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (key === refreshKey.current) setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const role: Role | undefined = snap?.roles.find((r) => r.id === roleId);
  const alerts = snap?.alerts ?? [];
  const urgentCount = alerts.filter((a) => a.severity === 'emergency' || a.severity === 'critical').length;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-google-bg">
        <div className="g-card p-8 max-w-md text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-[#fce8e6] flex items-center justify-center">
            <TrainFront className="w-7 h-7 text-google-red" />
          </div>
          <h1 className="text-lg font-medium text-google-ink mt-4">Backend not reachable</h1>
          <p className="text-sm text-google-gray mt-1">
            Start the FastAPI backend first, then refresh:
          </p>
          <pre className="text-xs bg-[#f8f9fa] border border-google-softline rounded-lg p-3 mt-3 text-left font-mono text-google-gray">
            cd backend{'\n'}python run.py
          </pre>
          <p className="text-xs text-google-red mt-3">{error}</p>
          <button onClick={load} className="g-btn mx-auto mt-4">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!snap) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-google-bg">
        <div className="flex items-center gap-3 text-google-muted">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <p className="text-sm">Loading railway orchestrator…</p>
        </div>
      </div>
    );
  }

  const canPlan = role?.can_plan ?? true;
  const activeTab = TABS.find((t) => t.id === tab)!;
  const locked = activeTab.planOnly && !canPlan;

  return (
    <div className="min-h-screen bg-google-bg">
      {/* Header */}
      <header className="bg-google-white border-b border-google-softline sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#4285f4] to-[#1a73e8] flex items-center justify-center shadow-sm">
              <TrainFront className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-medium leading-tight tracking-tight text-google-ink">
                RailSync <span className="text-google-blue">AI</span>
              </h1>
              <p className="text-xs text-google-muted -mt-0.5">
                Smart Railway Maintenance Orchestrator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden lg:inline text-xs text-google-muted">
              Plan week of <span className="font-medium text-google-gray">{snap.reference_date}</span>
            </span>

            {/* Role switcher (mock auth) */}
            <div className="relative">
              <button
                onClick={() => {}}
                className="flex items-center gap-2 border border-google-softline rounded-full pl-1 pr-3 py-1 hover:bg-google-bg transition"
              >
                <span className="w-7 h-7 rounded-full bg-[#e8f0fe] flex items-center justify-center">
                  <UserCircle className="w-5 h-5 text-google-blue" />
                </span>
                <span className="text-[13px] font-medium text-google-ink">{role?.label}</span>
                <ChevronDown className="w-4 h-4 text-google-muted" />
              </button>
              <select
                aria-label="Switch role"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
                title="Switch role (mock authentication)"
              >
                {snap.roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Alerts bell */}
            <div className="relative">
              <button
                onClick={() => setAlertsOpen((o) => !o)}
                className="relative w-10 h-10 rounded-full border border-google-softline flex items-center justify-center hover:bg-google-bg transition"
                aria-label="Alerts"
              >
                <Bell className="w-5 h-5 text-google-gray" />
                {urgentCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-google-red text-white text-[10px] font-medium flex items-center justify-center">
                    {urgentCount}
                  </span>
                )}
              </button>
              {alertsOpen && renderAlertDropdown(alerts, snap.reference_date, setAlertsOpen)}
            </div>

            <button onClick={load} disabled={refreshing} className="g-btn g-btn-tonal !px-4 !py-2">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{refreshing ? 'Refreshing…' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-[1400px] mx-auto px-6 flex items-center gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            const isLocked = t.planOnly && !canPlan;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-2 px-4 py-3 text-[13.5px] font-medium whitespace-nowrap transition ${
                  isActive ? 'text-google-blue' : 'text-google-gray hover:text-google-ink'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
                {isLocked && <Lock className="w-3.5 h-3.5 text-google-muted" />}
                <span
                  className={`absolute left-2 right-2 bottom-0 h-[3px] rounded-t-full transition ${
                    isActive ? 'bg-google-blue' : 'bg-transparent'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </header>

      {/* Mock-auth banner */}
      <div className="max-w-[1400px] mx-auto px-6 pt-3">
        <div className="flex items-center gap-2 text-[12px] text-google-gray bg-[#e8f0fe] rounded-lg px-3 py-2">
          <UserCircle className="w-4 h-4 text-google-blue shrink-0" />
          <span>
            Prototype mock authentication — operating as <strong>{role?.label}</strong>.
            {canPlan
              ? ' Planning tools enabled.'
              : ' Planning tools are switched off for this role.'}
          </span>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-6 py-5 space-y-5">
        {locked ? (
          <div className="g-card p-14 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-google-bg flex items-center justify-center">
              <Lock className="w-7 h-7 text-google-muted" />
            </div>
            <p className="text-base font-medium text-google-ink mt-4">
              Restricted to planning roles
            </p>
            <p className="text-sm text-google-gray mt-1 max-w-md mx-auto">
              Switch to <strong>Railway Planner</strong> or <strong>Admin</strong> in the header to
              run what-if simulations and approve blocks.
            </p>
          </div>
        ) : tab === 'overview' ? (
          <>
            <PipelineFlow />
            <KpiPanel kpis={snap.kpis} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                <DigitalTwin
                  stations={snap.network.stations}
                  sections={snap.network.sections}
                  tasks={snap.tasks}
                  opportunities={snap.opportunities}
                  trains={snap.trains}
                  blocks={snap.bdms_blocks}
                  selectedSection={selectedSection}
                  onSelect={setSelectedSection}
                />
              </div>
              <div className="space-y-5">
                <AlertsPanel alerts={alerts} onSelectSection={(id) => { setSelectedSection(id); setTab('tasks'); }} />
                <DelayPredictions predictions={snap.delay_predictions} />
              </div>
            </div>
            <Opportunities opportunities={snap.opportunities.slice(0, 4)} compact />
          </>
        ) : tab === 'tasks' ? (
          <Tasks
            tasks={snap.tasks}
            canUpdate={role?.can_update ?? false}
            allTasks={role?.all_tasks ?? false}
            roleDept={role?.department ?? null}
            onStatusChange={load}
          />
        ) : tab === 'opportunities' ? (
          <Opportunities opportunities={snap.opportunities} />
        ) : tab === 'weekly' ? (
          <WeeklyPlan plan={snap.weekly_plan} canPlan={canPlan} onChanged={load} />
        ) : tab === 'monthly' ? (
          <MonthlyView plan={snap.monthly_plan} resources={snap.resources} />
        ) : tab === 'whatif' ? (
          <WhatIfView
            sections={snap.network.sections}
            plan={snap.weekly_plan}
            canPlan={canPlan}
          />
        ) : (
          <CompareView data={snap.before_after} kpis={snap.kpis} />
        )}
      </main>

      <footer className="max-w-[1400px] mx-auto px-6 pb-6 pt-2 text-center text-xs text-google-muted">
        RailSync AI · SIH internal prototype · Synthetic data · AI-assisted, constraint-based &
        explainable decision-support — not autonomous
      </footer>
    </div>
  );
}

function renderAlertDropdown(
  alerts: Alert[],
  referenceDate: string,
  close: (v: boolean) => void,
) {
  return (
    <div
      className="absolute right-0 top-12 w-[380px] max-w-[90vw] g-card bg-google-white z-50 p-3 shadow-lg overflow-hidden"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="flex items-center justify-between px-1 pb-2 border-b border-google-softline">
        <p className="text-[13px] font-medium text-google-ink">Alerts</p>
        <button
          className="text-[12px] text-google-blue hover:underline"
          onClick={() => close(false)}
        >
          Close
        </button>
      </div>
      <div className="max-h-[360px] overflow-y-auto pt-2 space-y-2">
        {alerts.length === 0 && (
          <p className="text-sm text-google-muted px-1 py-3">
            No active alerts on {referenceDate}.
          </p>
        )}
        {alerts.map((a) => (
          <div
            key={a.alert_id}
            className="rounded-lg border border-google-softline p-2.5 text-[12.5px] leading-snug"
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ALERT_COLORS[a.severity] }} />
              <span className="font-medium text-google-ink capitalize">{a.kind.replace(/_/g, ' ')}</span>
              <span className="ml-auto text-[10px] uppercase text-google-muted">{a.severity}</span>
            </div>
            <p className="text-google-gray mt-1">{a.message}</p>
            <p className="text-google-muted mt-0.5 flex items-center gap-1">
              <span className="text-google-blue">→</span> {a.action}
            </p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-google-muted px-1 pt-2 border-t border-google-softline mt-2">
        Snapshot of {referenceDate} · prototype data
      </p>
    </div>
  );
}