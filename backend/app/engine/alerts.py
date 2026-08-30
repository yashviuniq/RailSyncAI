"""Alert engine (Section 18 of the project guide).

Continuously derives actionable alerts from the current data + plan:
  - critical defect detected
  - overdue maintenance
  - block conflict (two blocks overlap on the same section)
  - resource conflict (department workload exceeds crew capacity)
  - plan infeasibility (critical open work not yet scheduled)
  - emergency maintenance requirement (e.g. a what-if injected EMG task)
  - workload pressure (large high-severity backlog)
"""
from __future__ import annotations

import datetime as dt
from typing import Optional

from app.data.dataset import Dataset
from app.core.models import TaskStatus, Severity, MaintenancePlan


def compute_alerts(ds: Dataset, plan: MaintenancePlan,
                   reference_date: Optional[dt.date] = None) -> list[dict]:
    ref = reference_date or ds.today
    alerts: list[dict] = []
    counter = 0

    def add(severity: str, kind: str, message: str, action: str,
            section_id: str = ""):
        nonlocal counter
        counter += 1
        alerts.append({
            "alert_id": f"ALR-{counter:03d}",
            "severity": severity,
            "kind": kind,
            "message": message,
            "action": action,
            "section_id": section_id,
        })

    sec_name = lambda sid: ds.network.sections[sid].name if sid in ds.network.sections else sid

    open_tasks = [t for t in ds.tasks if t.status == TaskStatus.OPEN]
    critical = [t for t in open_tasks if t.severity == Severity.CRITICAL]
    high = [t for t in open_tasks if t.severity == Severity.HIGH]
    overdue = [t for t in open_tasks if t.due_date < ref]

    # 1. Critical defects
    for t in sorted(critical, key=lambda x: x.risk_score, reverse=True)[:4]:
        add("emergency", "critical_defect",
            f"Critical {t.defect_type} detected on {sec_name(t.section_id)} "
            f"({t.task_id}, risk {round(t.risk_score)}).",
            f"Schedule an emergency {t.estimated_minutes}-minute window within 12 hours.",
            t.section_id)

    # 2. Overdue maintenance
    if overdue:
        worst = sorted(overdue, key=lambda x: x.risk_score, reverse=True)[0]
        add("warning", "overdue",
            f"{len(overdue)} maintenance task(s) overdue (latest: "
            f"{worst.defect_type} on {sec_name(worst.section_id)} by "
            f"{(ref - worst.due_date).days} day(s)).",
            "Prioritize overdue work in the next available opportunity.",
            worst.section_id)

    # 3. Block conflicts (same section, overlapping blocks)
    seen_blk_conflict = set()
    blocks = list(plan.blocks)
    for i, a in enumerate(blocks):
        for b in blocks[i + 1:]:
            if a.section_id != b.section_id:
                continue
            if a.start_dt < b.end_dt and b.start_dt < a.end_dt:
                key = (a.block_id, b.block_id)
                if key not in seen_blk_conflict:
                    seen_blk_conflict.add(key)
                    add("critical", "block_conflict",
                        f"Block conflict: {a.block_id} and {b.block_id} overlap "
                        f"on {sec_name(a.section_id)}.",
                        "Re-plan one block to an adjacent window.",
                        a.section_id)

    # 4. Resource conflict (dept scheduled minutes > crew capacity)
    dept_capacity = {}
    for c in ds.crews:
        dept_capacity[c.department.value] = (
            dept_capacity.get(c.department.value, 0) + c.daily_hours * 60)
    task_by_id = {t.task_id: t for t in ds.tasks}
    dept_usage = {}
    for b in blocks:
        for tid in b.tasks:
            t = task_by_id.get(tid)
            if t:
                dept_usage[t.department.value] = (
                    dept_usage.get(t.department.value, 0) + t.estimated_minutes)
    for dept, used in dept_usage.items():
        cap = dept_capacity.get(dept, 24 * 60)
        if used > cap:
            add("warning", "resource_conflict",
                f"{dept} department workload {used} min exceeds crew capacity "
                f"{cap} min for the day.",
                "Spread work across days or request additional crew.")

    # 5. Plan infeasibility: critical open work not scheduled
    scheduled_ids = {tid for b in blocks for tid in b.tasks}
    unsched_critical = [t for t in critical if t.task_id not in scheduled_ids]
    if unsched_critical:
        add("critical", "plan_infeasible",
            f"{len(unsched_critical)} critical task(s) remain unscheduled "
            f"(e.g. {unsched_critical[0].task_id} on "
            f"{sec_name(unsched_critical[0].section_id)}).",
            "Insert emergency work or move lower-priority tasks out of the way.")

    # 6. New emergency maintenance requirement (injected via what-if)
    emergency_tasks = [t for t in ds.tasks if t.task_id.startswith("EMG-")]
    for t in emergency_tasks:
        if t.task_id not in scheduled_ids:
            add("emergency", "new_emergency",
                f"New emergency requirement ({t.defect_type}) on "
                f"{sec_name(t.section_id)} not yet accommodated.",
                "Re-run optimization to insert the emergency block.",
                t.section_id)

    # 7. High open workload (planning signal)
    if len(high) >= 4:
        add("info", "workload",
            f"{len(high)} high-severity open tasks; {len(open_tasks)} total backlog.",
            "Review monthly capacity for backlog clearance.")

    order = {"emergency": 0, "critical": 1, "warning": 2, "info": 3}
    alerts.sort(key=lambda a: order.get(a["severity"], 9))
    return alerts[:14]