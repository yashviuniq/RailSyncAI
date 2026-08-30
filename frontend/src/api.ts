import type {
  Snapshot,
  Kpis,
  BeforeAfter,
  WhatIfResult,
  Plan,
  Alert,
  Role,
  Block,
} from './types';

const BASE = import.meta.env.VITE_API_URL || '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

function post<T>(path: string): Promise<T> {
  return fetch(`${BASE}${path}`, { method: 'POST' }).then(
    (r) => r.json() as Promise<T>,
  );
}

export const api = {
  snapshot: () => get<Snapshot>('/snapshot'),
  kpis: () => get<Kpis>('/kpis'),
  alerts: () => get<Alert[]>('/alerts'),
  roles: () => get<Role[]>('/roles'),
  beforeAfter: () => get<BeforeAfter>('/before-after'),
  weekly: () => get<Plan>('/weekly'),
  monthly: () => get<Plan>('/monthly'),
  criticalDefect: (section: string) =>
    post<WhatIfResult>(`/whatif/critical-defect?section_id=${section}`),
  goodsTrain: (section: string, entryMinute: number) =>
    post<WhatIfResult>(
      `/whatif/goods-train?section_id=${section}&entry_minute=${entryMinute}`,
    ),
  cancelBlock: (blockId: string) =>
    post<WhatIfResult>(`/whatif/cancel-block?block_id=${blockId}`),
  extendBlock: (blockId: string, minutes: number) =>
    post<WhatIfResult>(
      `/whatif/extend-block?block_id=${blockId}&minutes=${minutes}`,
    ),
  crewUnavailable: (department: string) =>
    post<WhatIfResult>(`/whatif/crew-unavailable?department=${department}`),
  setBlockStatus: (blockId: string, status: string) =>
    post<Block>(`/plan/blocks/${blockId}/status?status=${status}`),
  setTaskStatus: (taskId: string, status: string) =>
    post<Snapshot>(`/tasks/${taskId}/status?status=${status}`),
};