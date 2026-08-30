// TypeScript types matching the FastAPI backend payloads

export interface Station {
  id: string;
  name: string;
}

export interface Section {
  id: string;
  name: string;
  station_a: string;
  station_b: string;
  length_km: number;
  track_health: number;
  ohe_health: number;
  signal_health: number;
  traffic_level: string;
  route_class: string;
  max_speed: number;
}

export interface Task {
  task_id: string;
  source_system: string;
  department: string;
  section_id: string;
  section_name: string;
  location_km: number;
  asset: string;
  defect_type: string;
  severity: string;
  detected_date: string;
  due_date: string;
  estimated_minutes: number;
  status: string;
  risk_score: number;
  risk_factors: Record<string, number>;
  description: string;
  explanations?: string[];
  priority?: string;
}

export interface Opportunity {
  opportunity_id: string;
  section_id: string;
  section_name: string;
  start: string;
  end: string;
  available_window_minutes: number;
  tasks: Task[];
  departments: string[];
  train_impact_min: number;
  opportunity_score: number;
  reasons: string[];
}

export interface Block {
  block_id: string;
  section_id: string;
  section_name: string;
  start: string;
  end: string;
  departments: string[];
  tasks: string[];
  status: string;
  train_impact_min: number;
  opportunity_score: number;
  notes: string;
}

export interface Plan {
  horizon: string;
  start: string;
  end: string;
  kpis: Record<string, any>;
  blocks: Block[];
  deferred_tasks: string[];
}

export interface MonthlyPlan {
  month: string;
  open_tasks: number;
  critical_open: number;
  high_open: number;
  weekly_blocks: number;
  weekly_tasks: number;
  department_workload_min: Record<string, number>;
  monthly_task_demand_est: number;
}

export interface Kpis {
  tasks_total: number;
  tasks_open: number;
  tasks_scheduled: number;
  tasks_completed: number;
  critical_open: number;
  backlog_pct: number;
  asset_availability_pct: number;
  blocks: number;
  solo_blocks: number;
  combined_blocks: number;
  block_utilization_pct: number;
  unused_block_min: number;
  total_block_min: number;
  scheduled_task_min: number;
  train_impact_total_min: number;
  avg_train_delay_min: number;
  train_delay_avoided_min: number;
  maintenance_hours_saved: number;
  resource_utilization_pct: number;
}

export interface Alert {
  alert_id: string;
  severity: 'emergency' | 'critical' | 'warning' | 'info';
  kind: string;
  message: string;
  action: string;
  section_id: string;
}

export interface DelayPrediction {
  train_number: string;
  train_name: string;
  train_type: string;
  sections: string[];
  entry_minute: number;
  expected_delay_min: number;
  predicted_delay_min: number;
}

export interface Role {
  id: string;
  label: string;
  department: string | null;
  can_plan: boolean;
  can_update: boolean;
  all_tasks: boolean;
}

export interface BeforeAfter {
  metric: string[];
  existing: number[];
  proposed: number[];
}

export interface WhatIfResult {
  new_task?: Task & { explanations?: string[]; priority?: string; inserted?: boolean };
  inserted?: boolean;
  recommendation?: string;
  comparison?: {
    current: PlanSummary;
    alternative: PlanSummary;
    moved_tasks?: Task[];
  };
  updated_plan?: Plan;
  new_train?: {
    train_number: string;
    train_name: string;
    entry_minute: number;
    sections: string[];
  };
  moved_tasks?: Task[];
  cancelled_block?: Block;
  deferred_tasks?: Task[];
  backlog_increase?: number;
  risk_increase?: number;
  block?: Block;
  extension_minutes?: number;
  additional_tasks?: Task[];
  additional_trains_impacted?: number;
  recommended?: boolean;
  message?: string;
  error?: string;
}

export interface PlanSummary {
  blocks: number;
  tasks: number;
  combined_blocks: number;
  train_impact_min: number;
  total_block_min: number;
}

export interface Snapshot {
  reference_date: string;
  network: { stations: Station[]; sections: Section[] };
  tasks: Task[];
  trains: Array<{
    train_number: string;
    train_name: string;
    train_type: string;
    sections: string[];
    direction: string;
    entry_minute: number;
    expected_delay_min: number;
    goods_confidence: number;
  }>;
  opportunities: Opportunity[];
  weekly_plan: Plan;
  monthly_plan: Plan;
  kpis: Kpis;
  before_after: BeforeAfter;
  bdms_blocks: Block[];
  alerts: Alert[];
  delay_predictions: DelayPrediction[];
  resources: { crews: Record<string, string[]>; machines: Record<string, string[]>; total_crews: number; total_machines: number };
  roles: Role[];
}