"""Monthly capacity & strategic planning.

Higher-level than the weekly plan: estimates backlog, planned work, department
workload, and block demand across a month, based on the weekly engine output
scaled over 4 weeks with a simple forecast of defect inflow.
"""
from __future__ import annotations

import datetime as dt
from typing import Optional

from app.core.models import (
    Department, MaintenancePlan, Block, BlockStatus, Severity,
)
from app.data.dataset import Dataset


class MonthlyPlanner:
    def __init__(self, ds: Dataset, reference_date: dt.date):
        self.ds = ds
        self.ref = reference_date

    def build(self, weekly_plan: MaintenancePlan) -> MaintenancePlan:
        start = self.ref.replace(day=1)
        # approximate month end
        if start.month == 12:
            end = start.replace(year=start.year + 1, month=1) - dt.timedelta(days=1)
        else:
            end = start.replace(month=start.month + 1) - dt.timedelta(days=1)

        plan = MaintenancePlan(
            horizon="MONTH",
            start_date=start,
            end_date=end,
            kpis=self._monthly_kpis(weekly_plan),
        )
        return plan

    def _monthly_kpis(self, weekly: MaintenancePlan) -> dict:
        tasks = self.ds.tasks
        open_tasks = [t for t in tasks if t.status.value == "OPEN"]
        critical = [t for t in open_tasks if t.severity == Severity.CRITICAL]
        high = [t for t in open_tasks if t.severity == Severity.HIGH]

        # workload per department = distinct scheduled task minutes per dept
        task_by_id = {t.task_id: t for t in tasks}
        dept_minutes: dict[str, int] = {}
        seen: set[str] = set()
        for b in weekly.blocks:
            for tid in b.tasks:
                if tid in seen:
                    continue
                seen.add(tid)
                t = task_by_id.get(tid)
                if t:
                    dept_minutes[t.department.value] = \
                        dept_minutes.get(t.department.value, 0) + t.estimated_minutes

        return {
            "month": f"{self.ref.strftime('%B %Y')}",
            "open_tasks": len(open_tasks),
            "critical_open": len(critical),
            "high_open": len(high),
            "weekly_blocks": len(weekly.blocks),
            "weekly_tasks": len(seen),
            "department_workload_min": dept_minutes,
            "monthly_task_demand_est": round(len(open_tasks) * 3.5),
        }
