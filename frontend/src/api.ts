import type {
  Snapshot,
  Kpis,
  BeforeAfter,
  WhatIfResult,
  Plan,
} from './types';

const BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export const api = {
  snapshot: () => get<Snapshot>('/snapshot'),
  kpis: () => get<Kpis>('/kpis'),
  beforeAfter: () => get<BeforeAfter>('/before-after'),
  weekly: () => get<Plan>('/weekly'),
  monthly: () => get<Plan>('/monthly'),
  criticalDefect: (section: string) =>
    fetch(`${BASE}/whatif/critical-defect?section_id=${section}`, {
      method: 'POST',
    }).then((r) => r.json() as Promise<WhatIfResult>),
  goodsTrain: (section: string, entryMinute: number) =>
    fetch(
      `${BASE}/whatif/goods-train?section_id=${section}&entry_minute=${entryMinute}`,
      { method: 'POST' },
    ).then((r) => r.json() as Promise<WhatIfResult>),
};
