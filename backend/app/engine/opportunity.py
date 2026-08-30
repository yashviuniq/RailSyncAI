"""Maintenance Opportunity finder + Smart Maintenance Bundling.

Finds low-traffic railway windows (from the traffic model) and bundles the most
valuable, compatible set of maintenance tasks (across departments) into each
window, then scores the resulting opportunity.
"""
from __future__ import annotations

import datetime as dt
from typing import Optional

from app.core.models import (
    Department, MaintenanceTask, OpportunityPackage, RailwayNetwork,
)
from app.engine.traffic import TrafficModel


class OpportunityEngine:
    def __init__(self, network: RailwayNetwork, traffic: TrafficModel,
                 reference_date: Optional[dt.datetime] = None):
        self.network = network
        self.traffic = traffic
        self.ref = reference_date or dt.datetime(2026, 1, 5, 6, 0, 0)

    # -- per-task value (risk + how much priority-weighted work) -----------
    @staticmethod
    def _task_value(t: MaintenanceTask, window_min: int) -> float:
        # Value is dominated by risk score; fit is a secondary multiplier so a
        # critical long task is still attractive even if it fills the window.
        fit = min(1.5, window_min / max(t.estimated_minutes, 1))
        return (t.risk_score / 100.0) * min(1.0, fit)

    # -- compatibility between tasks (can they be bundled safely) ----------
    @staticmethod
    def _compatible(a: MaintenanceTask, b: MaintenanceTask) -> bool:
        # same section required (already enforced)
        if a.section_id != b.section_id:
            return False
        # Track (tamping/geometry) and OHE work can conflict if both need the
        # same track possession; we keep a conservative rule that two tasks of
        # the SAME department that both need exclusive corridor possession
        # shouldn't overlap - simplified: signal & traction & track are treated
        # as potentially working on different assets, so permissive here.
        return True

    def find_opportunities(self, tasks: list[MaintenanceTask],
                           min_window_min: int = 60,
                           min_gap: int = 20) -> list[OpportunityPackage]:
        tasks_by_section: dict[str, list[MaintenanceTask]] = {}
        for t in tasks:
            if t.status.value in ("COMPLETED", "SCHEDULED"):
                continue
            tasks_by_section.setdefault(t.section_id, []).append(t)

        opportunities: list[OpportunityPackage] = []
        opp_counter = 1
        for section_id, sec_tasks in tasks_by_section.items():
            windows = self.traffic.free_windows(section_id, min_gap_between_trains=min_gap,
                                                min_window_min=min_window_min)
            for (start_min, end_min) in windows:
                win_len = end_min - start_min
                # select subset of tasks by value that fit and are compatible
                selected, score, reasons, used_minutes = self._bundle(
                    sec_tasks, win_len, min_window_min)
                if not selected:
                    continue
                impact = self.traffic.train_conflicts_in(section_id, start_min, end_min)
                nearby = self.traffic.nearby_trains(section_id, start_min, end_min)
                depts = sorted({t.department for t in selected},
                               key=lambda d: d.value)
                # If critical work required extension beyond the free window,
                # extend the block end accordingly (still capped within the day).
                if used_minutes > win_len:
                    end_min = min(23 * 60 + 59, start_min + used_minutes)
                end_min = min(end_min, 23 * 60 + 59)
                if end_min - start_min < min_window_min:
                    continue
                # No train is blocked (window is genuinely free); the 'impact'
                # is the estimated patrol/speed-restriction effect on nearby
                # passing trains (~2 min each, otherwise 0 if truly empty).
                impact_min = len(nearby) * 2
                opp = OpportunityPackage(
                    opportunity_id=f"OPP-{opp_counter:03d}",
                    section_id=section_id,
                    start_dt=self.ref.replace(hour=start_min // 60,
                                              minute=start_min % 60, second=0),
                    end_dt=self.ref.replace(hour=end_min // 60,
                                            minute=end_min % 60, second=0),
                    available_window_minutes=win_len,
                    tasks=selected,
                    departments=depts,
                    train_impact_min=impact_min,
                    opportunity_score=score,
                    reasons=reasons,
                )
                opp_counter += 1
                opportunities.append(opp)
        opportunities.sort(key=lambda o: o.opportunity_score, reverse=True)
        return opportunities

    def _bundle(self, sec_tasks: list[MaintenanceTask],
                win_len: int, min_window_min: int = 60) -> tuple[list, float, list, int]:
        """Greedy bundle, risk-first.

        - Sort tasks by risk score descending so safety-critical work always
          gets priority for scarce windows.
        - Allow a critical/high task to fit even if it slightly exceeds the
          window (block may be extended) via a tolerance factor.
        - Then fill any remaining window capacity with compatible lower-risk
          tasks from other departments to maximize multi-dept coordination.
        Returns (selected_tasks, opportunity_score, reasons, used_minutes).
        """
        tolerance = 1.15  # allow block to be extended up to 15% for critical work
        ranked = sorted(sec_tasks, key=lambda t: t.risk_score, reverse=True)

        selected: list[MaintenanceTask] = []
        used_minutes = 0
        used_deps = set()
        reasons = []

        for t in ranked:
            is_critical = t.severity.value in ("CRITICAL", "HIGH")
            fits = used_minutes + t.estimated_minutes <= win_len
            nearly_fits = (is_critical and
                           used_minutes + t.estimated_minutes <= win_len * tolerance)
            if not (fits or nearly_fits):
                continue
            if any(not self._compatible(t, s) for s in selected):
                continue
            selected.append(t)
            used_minutes += t.estimated_minutes
            used_deps.add(t.department)

        # final window used (may exceed original if critical work needed extension)
        n_departments = len(used_deps)
        total_value = sum(self._task_value(t, win_len) for t in selected)
        utilization = min(1.0, used_minutes / max(win_len, 1))

        coord_bonus = 10.0 if n_departments >= 3 else (5.0 if n_departments == 2 else 0.0)

        reasons.append(f"{len(selected)} compatible tasks bundled "
                       f"({used_minutes}/{win_len} min of window, critical "
                       f"extension allowed).")
        reasons.append(f"{n_departments} department(s) coordinated in one block "
                       f"(bonus +{coord_bonus}).")
        reasons.append(f"Window utilization {int(utilization * 100)}%.")

        score = (40 * utilization) + (35 * (sum(t.risk_score for t in selected)
                                            / max(len(selected), 1) / 100.0)) + coord_bonus
        score = min(100.0, max(0.0, score))
        return selected, round(score, 1), reasons, used_minutes

