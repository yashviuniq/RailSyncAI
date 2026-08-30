import { useMemo, useState } from 'react';
import { ClipboardList, Lock, Search, CheckCircle2, Circle } from 'lucide-react';
import type { Task } from '../types';
import { api } from '../api';
import { SEVERITY_COLORS, DEPT_COLORS, priorityClass } from '../utils';
import { Panel, Badge } from './Panel';

const FACTOR_LABELS: Record<string, string> = {
  severity: 'Severity',
  safety: 'Safety criticality',
  urgency: 'Urgency / age',
  traffic: 'Traffic impact',
  route: 'Route importance',
  asset: 'Asset criticality',
};

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'DEFERRED'] as const;

export function Tasks({
  tasks,
  canUpdate,
  allTasks,
  roleDept,
  onStatusChange,
}: {
  tasks: Task[];
  canUpdate: boolean;
  allTasks: boolean;
  roleDept: string | null;
  onStatusChange: () => void;
}) {
  const [deptFilter, setDeptFilter] = useState('All');
  const [sevFilter, setSevFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [openWhy, setOpenWhy] = useState<string | null>(null);

  const depts = Array.from(new Set(tasks.map((t) => t.department)));

  const filtered = useMemo(() => {
    let list = tasks;
    if (deptFilter !== 'All') list = list.filter((t) => t.department === deptFilter);
    if (sevFilter !== 'All') list = list.filter((t) => t.severity === sevFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (t) =>
          t.task_id.toLowerCase().includes(q) ||
          t.defect_type.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => b.risk_score - a.risk_score);
  }, [tasks, deptFilter, sevFilter, query]);

  const openCount = tasks.filter((t) => t.status === 'OPEN').length;

  return (
    <Panel
      title="Maintenance Tasks & Risk"
      subtitle={
        <>
          Prioritized backlog from <strong>TMS</strong> / <strong>SMMS</strong> /{' '}
          <strong>TDMS</strong> with explainable risk scores · {openCount} open
        </>
      }
      icon={<ClipboardList className="w-4 h-4" />}
    >
      {/* filters */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <div className="relative">
          <Search className="w-4 h-4 text-google-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search task, defect…"
            className="g-input pl-9 w-56"
          />
        </div>
        <FilterChip active={deptFilter === 'All'} onClick={() => setDeptFilter('All')}>
          All ({tasks.length})
        </FilterChip>
        {depts.map((d) => (
          <FilterChip key={d} active={deptFilter === d} onClick={() => setDeptFilter(d)}>
            <span className="w-2 h-2 rounded-full" style={{ background: DEPT_COLORS[d] }} />
            {d}
          </FilterChip>
        ))}
        <span className="mx-1 w-px h-5 bg-google-softline hidden sm:block" />
        {['All', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
          <FilterChip key={s} active={sevFilter === s} onClick={() => setSevFilter(s)}>
            {s === 'All' ? 'Any severity' : s}
          </FilterChip>
        ))}
      </div>

      <div className="space-y-1.5 max-h-[560px] overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <p className="text-sm text-google-muted py-3">No tasks match the current filters.</p>
        )}
        {filtered.map((t) => (
          <TaskRow
            key={t.task_id}
            task={t}
            openWhy={openWhy === t.task_id}
            onToggleWhy={() => setOpenWhy(openWhy === t.task_id ? null : t.task_id)}
            canUpdate={canUpdate}
            canUpdateTask={allTasks || roleDept === t.department}
            onStatus={async (status) => {
              await api.setTaskStatus(t.task_id, status);
              onStatusChange();
            }}
          />
        ))}
      </div>
    </Panel>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button className={`g-chip ${active ? 'g-chip-active' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

function TaskRow({
  task,
  openWhy,
  onToggleWhy,
  canUpdate,
  canUpdateTask,
  onStatus,
}: {
  task: Task;
  openWhy: boolean;
  onToggleWhy: () => void;
  canUpdate: boolean;
  canUpdateTask: boolean;
  onStatus: (status: string) => void;
}) {
  const overdue = task.status === 'OPEN' && new Date(task.due_date) < new Date();
  const canChange = canUpdate && canUpdateTask;

  return (
    <div className="rounded-xl border border-google-softline bg-google-white p-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="w-1 self-stretch rounded-full" style={{ background: SEVERITY_COLORS[task.severity] }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13.5px] font-medium text-google-ink">{task.task_id}</span>
            <Badge className="bg-google-bg text-google-gray">{task.source_system}</Badge>
            <Badge className="bg-[#e8f0fe] text-google-blue-dark">
              <span className="w-2 h-2 rounded-full" style={{ background: DEPT_COLORS[task.department] }} />
              {task.department}
            </Badge>
            <span className="text-[11.5px] text-google-muted">{task.section_name}</span>
            {overdue && <Badge className="bg-[#fce8e6] text-[#d93025]">overdue</Badge>}
          </div>
          <p className="text-[12px] text-google-gray mt-0.5 truncate">{task.description}</p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className={`text-[13px] font-medium rounded-full px-2.5 py-0.5 ${priorityClass(task.risk_score)}`}>
            {Math.round(task.risk_score)}
          </span>
          <span className="text-[10px] text-google-muted">
            {task.estimated_minutes}m · {task.severity}
          </span>
        </div>

        {/* status */}
        {canChange ? (
          <select
            aria-label="Update task status"
            value={task.status}
            onChange={(e) => onStatus(e.target.value)}
            className={`g-input text-[12px] py-1 px-2 w-[130px] ${statusClass(task.status)}`}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ) : (
          <Badge className={`${statusClass(task.status)} !text-[11px]`}>
            {task.status === 'COMPLETED' ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
            {task.status.replace(/_/g, ' ')}
            {!canUpdateTask && task.status === 'OPEN' && <Lock className="w-3 h-3 text-google-muted" />}
          </Badge>
        )}

        <button
          onClick={onToggleWhy}
          className="text-[12px] font-medium text-google-blue hover:underline whitespace-nowrap"
        >
          {openWhy ? 'Hide why' : 'Why?'}
        </button>
      </div>

      {openWhy && task.explanations && (
        <div className="mt-2 ml-2 text-[12px] text-google-gray border-l-2 border-google-blue/30 pl-3">
          <p className="font-medium text-google-ink mb-1">
            Priority {Math.round(task.risk_score)} — why?
          </p>
          <ul className="list-disc pl-4 space-y-0.5">
            {task.explanations.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
          {task.risk_factors && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {Object.entries(task.risk_factors).map(([k, v]) => (
                <span
                  key={k}
                  className="rounded-full border border-google-softline bg-google-white px-2 py-0.5 text-[11px] text-google-gray"
                >
                  {FACTOR_LABELS[k] ?? k}: <strong className="text-google-ink">{Math.round(v)}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function statusClass(status: string): string {
  if (status === 'COMPLETED') return 'bg-[#e6f4ea] text-[#188038]';
  if (status === 'IN_PROGRESS') return 'bg-[#e8f0fe] text-google-blue-dark';
  if (status === 'DEFERRED') return 'bg-[#fef7e0] text-[#b06000]';
  return 'bg-google-bg text-google-gray';
}