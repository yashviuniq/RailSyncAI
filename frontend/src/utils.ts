// Formatting helpers + Google/Material design palette used across the dashboard

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export function fmtClock(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = Math.round(min % 60).toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${m} ${ampm}`;
}

export function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Department colors
export const DEPT_COLORS: Record<string, string> = {
  Engineering: '#1a73e8', // track - Google blue
  'S&T': '#188038', // signal - Google green
  Electrical: '#f9ab00', // traction - Google yellow
};

// Severity colors
export const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#d93025',
  HIGH: '#f9ab00',
  MEDIUM: '#fbbc04',
  LOW: '#188038',
};

export const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export function priorityClass(score: number | undefined): string {
  if (score === undefined) return 'bg-slate-200 text-slate-700';
  if (score >= 80) return 'bg-[#fce8e6] text-[#d93025]';
  if (score >= 60) return 'bg-[#fef7e0] text-[#b06000]';
  if (score >= 40) return 'bg-[#fef7e0] text-[#7f6000]';
  return 'bg-[#e6f4ea] text-[#188038]';
}

export function trafficColor(v: string): string {
  if (v === 'VERY_HIGH') return '#d93025';
  if (v === 'HIGH') return '#f9ab00';
  if (v === 'MEDIUM') return '#fbbc04';
  return '#34a853';
}

export function scoreColor(s: number): string {
  if (s >= 80) return '#188038';
  if (s >= 60) return '#1a73e8';
  if (s >= 40) return '#f9ab00';
  return '#80868b';
}

export function fmtEngagement(value: number): string {
  return value >= 1 ? `${value}h` : `${Math.round(value * 60)}m`;
}