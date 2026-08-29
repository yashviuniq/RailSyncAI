import { useState } from 'react';
import type { Task } from '../types';
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

export function Tasks({ tasks }: { tasks: Task[] }) {
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const depts = Array.from(new Set(tasks.map((t) => t.department)));
  const filtered = deptFilter === 'All' ? tasks : tasks.filter((t) => t.department === deptFilter);
  const sorted = [...filtered].sort((a, b) => b.risk_score - a.risk_score);

  return (
    <Panel
      title="Maintenance Tasks & Risk"
      subtitle="Prioritized backlog from TMS / SMMS / TDMS with explainable risk scores"
    >
      <div className="mb-3 flex gap-2 flex-wrap">
        <button
          onClick={() => setDeptFilter('All')}
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            deptFilter === 'All' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          All ({tasks.length})
        </button>
        {depts.map((d) => (
          <button
            key={d}
            onClick={() => setDeptFilter(d)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              deptFilter === d ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle"
                 style={{ background: DEPT_COLORS[d] }} />
            {d}
          </button>
        ))}
      </div>

      <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
        {sorted.map((t) => (
          <TaskRow key={t.task_id} task={t} />
        ))}
      </div>
    </Panel>
  );
}

function TaskRow({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);
  const overdue =
    task.status === 'OPEN' && new Date(task.due_date) < new Date();

  return (
    <div className="border border-slate-200 rounded-lg p-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="w-2 h-8 rounded-sm"
          style={{ background: SEVERITY_COLORS[task.severity] }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-800">{task.task_id}</span>
            <Badge className="bg-slate-100 text-slate-600">{task.source_system}</Badge>
            <Badge className="bg-slate-800 text-white">
              <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle"
                   style={{ background: DEPT_COLORS[task.department] ?? '#888' }} />
              {task.department}
            </Badge>
            <span className="text-xs text-slate-500">{task.section_name}</span>
            {overdue && <Badge className="bg-red-100 text-red-700">overdue</Badge>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{task.description}</p>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-sm font-bold rounded px-2 ${priorityClass(task.risk_score)}`}>
            {Math.round(task.risk_score)}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5">{task.estimated_minutes}m · {task.severity}</span>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-xs text-blue-700 font-medium hover:underline whitespace-nowrap"
        >
          {open ? 'Hide why' : 'Why?'}
        </button>
      </div>

      {open && task.explanations && (
        <div className="mt-2 pl-4 text-xs text-slate-600 border-l-2 border-slate-200">
          <ul className="list-disc pl-4 space-y-0.5">
            {task.explanations.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
          {task.risk_factors && (
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(task.risk_factors).map(([k, v]) => (
                <span key={k} className="rounded bg-slate-50 border border-slate-200 px-2 py-0.5 text-[11px]">
                  {FACTOR_LABELS[k] ?? k}: <strong>{Math.round(v)}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
