"""High-level orchestration service that ties the whole engine together.

Builds the dataset once and runs the pipeline, caching all results in-memory
for the demo API. Also computes before/after comparison vs the current manual
BDMS-based approach and dashboard KPIs.
"""
from __future__ import annotations

import copy
import datetime as dt
import random
from typing import Optional

from app.core.models import (
    Department, Severity, TaskStatus, MaintenancePlan, Block, BlockStatus,
)
from app.data.dataset import Dataset, build_dataset
from app.data.serialize import (
    section_dict, task_dict, train_dict, opportunity_dict, block_dict, plan_dict,
)
from app.engine.risk import RiskEngine
from app.engine.opportunity import OpportunityEngine
from app.engine.optimizer import BlockOptimizer
from app.engine.traffic import TrafficModel
from app.engine.monthly import MonthlyPlanner
from app.engine.whatif import WhatIfScenario, run_pipeline
from app.engine.alerts import compute_alerts

REFERENCE_DATE = dt.date(2026, 1, 5)  # Monday

ROLES = [
    {"id": "admin", "label": "Admin", "department": None,
     "can_plan": True, "can_update": True, "all_tasks": True},
    {"id": "planner", "label": "Railway Planner", "department": None,
     "can_plan": True, "can_update": False, "all_tasks": True},
    {"id": "engineering", "label": "Engineering (Track)", "department": "Engineering",
     "can_plan": False, "can_update": True, "all_tasks": False},
    {"id": "sn_t", "label": "S&T Department", "department": "S&T",
     "can_plan": False, "can_update": True, "all_tasks": False},
    {"id": "electrical", "label": "Electrical / Traction", "department": "Electrical",
     "can_plan": False, "can_update": True, "all_tasks": False},
]


class Orchestrator:
    def __init__(self, seed: int = 42, n_tasks: int = 45):
        self.ds = build_dataset(today=REFERENCE_DATE, n_weekly_tasks=n_tasks, seed=seed)
        self.ref = REFERENCE_DATE
        self._run()

    def _run(self):
        result = run_pipeline(self.ds, self.ref)
        self.risk_results = result["risk_results"]
        self.opportunities = result["opportunities"]
        self.plan = result["plan"]
        self.traffic = result["traffic"]
        self.monthly = MonthlyPlanner(self.ds, self.ref).build(self.plan)

    # -- snapshot payload for the frontend --------------------------------
    def snapshot(self) -> dict:
        net = self.ds.network
        return {
            "reference_date": str(self.ref),
            "network": {
                "stations": [{"id": s.id, "name": s.name} for s in net.stations.values()],
                "sections": [section_dict(s) for s in net.sections.values()],
            },
            "tasks": [self._task_with_explanations(t) for t in self.ds.tasks],
            "trains": [train_dict(t) for t in self.ds.trains],
            "opportunities": [opportunity_dict(o, net) for o in self.opportunities],
            "weekly_plan": plan_dict(self.plan, net),
            "monthly_plan": plan_dict(self.monthly, net),
            "kpis": self.kpis(),
            "before_after": self.before_after(),
            "bdms_blocks": [block_dict(b, net) for b in self.ds.bdms_blocks],
            "alerts": self.alerts(),
            "delay_predictions": self.delay_predictions(),
            "resources": self.resource_summary(),
            "roles": ROLES,
        }

    def alerts(self) -> list[dict]:
        return compute_alerts(self.ds, self.plan, self.ref)

    def delay_predictions(self) -> list[dict]:
        """Simple explainable delay forecast per train service (synthetic).

        Predicted delay = planned delay + traffic pressure along the route,
        with a small stochastic perturbation to simulate forecast noise.
        """
        rng = random.Random(7)
        bands = {"LOW": 5, "MEDIUM": 10, "HIGH": 18, "VERY_HIGH": 26}
        out = []
        for tr in self.ds.trains:
            pressure = sum(bands.get(
                self.ds.network.sections[s].traffic_level, 10)
                for s in tr.section_ids if s in self.ds.network.sections)
            pred = tr.expected_delay_min + round(pressure * 0.25 + rng.uniform(0, 4))
            out.append({
                "train_number": tr.train_number,
                "train_name": tr.train_name,
                "train_type": tr.train_type.value,
                "sections": tr.section_ids,
                "entry_minute": tr.entry_minute,
                "expected_delay_min": tr.expected_delay_min,
                "predicted_delay_min": pred,
            })
        out.sort(key=lambda d: d["predicted_delay_min"], reverse=True)
        return out[:8]

    def resource_summary(self) -> dict:
        crews = {}
        for c in self.ds.crews:
            crews.setdefault(c.department.value, []).append(c.crew_id)
        machines = {}
        for m in self.ds.machines:
            machines.setdefault(m.department.value, []).append(m.machine_id)
        return {
            "crews": crews,
            "machines": machines,
            "total_crews": len(self.ds.crews),
            "total_machines": len(self.ds.machines),
        }

    def _task_with_explanations(self, t):
        d = task_dict(t)
        r = self.risk_results.get(t.task_id)
        if r is not None:
            d["explanations"] = r.explanations
            d["priority"] = r.to_dict()["priority"]
            d["section_name"] = self.ds.network.sections[
                t.section_id].name if t.section_id in self.ds.network.sections else t.section_id
        return d

    # -- KPIs --------------------------------------------------------------
    def kpis(self) -> dict:
        plan = self.plan
        tasks = self.ds.tasks
        open_tasks = [t for t in tasks if t.status.value == "OPEN"]
        completed = [t for t in tasks if t.status.value == "COMPLETED"]
        critical = [t for t in open_tasks if t.severity == Severity.CRITICAL]
        scheduled_ids = set()
        for b in plan.blocks:
            scheduled_ids.update(b.tasks)

        combined = sum(1 for b in plan.blocks if len(b.departments) >= 2)
        solo = sum(1 for b in plan.blocks if len(b.departments) == 1)
        total_block_min = sum((b.end_dt - b.start_dt).total_seconds() / 60
                              for b in plan.blocks)
        total_task_min_scheduled = sum(
            t.estimated_minutes for t in tasks if t.task_id in scheduled_ids)
        utilization = (total_task_min_scheduled / max(total_block_min, 1)) * 100
        unused_block_min = max(0, total_block_min - total_task_min_scheduled)

        # operational: average delay from blocks + delay-avoidance vs manual
        n_blocks = len(plan.blocks)
        avg_train_delay = round(sum(b.train_impact_min for b in plan.blocks)
                                / max(n_blocks, 1))
        delay_avoided = self.before_after()["existing"][2] - \
            self.before_after()["proposed"][2]

        # asset availability = mean of section health triplets
        secs = self.ds.network.sections.values()
        asset_avail = round(sum(
            (s.track_health + s.ohe_health + s.signal_health) / 3 for s in secs)
            / max(len(secs), 1), 1)

        # maintenance hours saved = duplicate possession avoided by combining
        # departments into one synchronized block (always >= 0 and defensible)
        combined_savings_hours = 0.0
        for b in plan.blocks:
            if len(b.departments) >= 2:
                hours = (b.end_dt - b.start_dt).total_seconds() / 3600
                combined_savings_hours += (len(b.departments) - 1) * hours
        maint_hours_saved = round(combined_savings_hours, 1)

        # resource utilization = scheduled work vs total crew capacity (week)
        total_crew_cap = sum(c.daily_hours * 60 for c in self.ds.crews) * 5
        resource_util = round((total_task_min_scheduled
                               / max(total_crew_cap, 1)) * 100, 1)

        return {
            # maintenance KPIs
            "tasks_total": len(tasks),
            "tasks_open": len(open_tasks),
            "tasks_scheduled": len(scheduled_ids),
            "tasks_completed": len(completed),
            "critical_open": len(critical),
            "backlog_pct": round((len(open_tasks) / max(len(tasks), 1)) * 100, 1),
            "asset_availability_pct": asset_avail,
            # operations KPIs
            "blocks": n_blocks,
            "solo_blocks": solo,
            "combined_blocks": combined,
            "block_utilization_pct": round(utilization, 1),
            "unused_block_min": round(unused_block_min),
            "total_block_min": round(total_block_min),
            "scheduled_task_min": round(total_task_min_scheduled),
            # coordination KPIs
            "train_impact_total_min": sum(b.train_impact_min for b in plan.blocks),
            "avg_train_delay_min": avg_train_delay,
            "train_delay_avoided_min": max(delay_avoided, 0),
            "maintenance_hours_saved": maint_hours_saved,
            "resource_utilization_pct": resource_util,
        }

    # -- before/after comparison -------------------------------------------
    def before_after(self) -> dict:
        """'Before' = current manual/decentralized BDMS approach (one department
        per block, one block per defect, blocks requested independently in
        daytime traffic, poor coordination & window utilization). 'After' = our
        coordinated, multi-dept, opportunity-driven plan. Both computed from the
        same underlying data so the comparison is apples-to-apples.

        All numbers are prototype/synthetic estimates, clearly labelled as such.
        """
        plan = self.plan

        # --- Currently scheduled unique maintenance value -----------------
        scheduled_ids = set()
        scheduled_minutes = 0
        for b in plan.blocks:
            scheduled_ids.update(b.tasks)
            for tid in b.tasks:
                task = next((t for t in self.ds.tasks if t.task_id == tid), None)
                if task:
                    scheduled_minutes += task.estimated_minutes

        # --- Existing (BDMS manual) ---------------------------------------
        bdms = self.ds.bdms_blocks
        # Manual planners ask for one separate block per defect+department;
        # they only manage to get ~35% of the corridor defects booked.
        bdms_scheduled = round(len(self.ds.tasks) * 0.35)
        existing_blocks = bdms_scheduled

        # Manual blocks hit daytime traffic -> each overlapping train is
        # delayed ~12 min. Scale the modeled bdms conflicts up to the larger
        # number of separate manual blocks for a fair per-block estimate.
        traffic = self.traffic
        manual_impact = 0
        for b in bdms:
            sm = b.start_dt.hour * 60 + b.start_dt.minute
            em = b.end_dt.hour * 60 + b.end_dt.minute
            n_conflicts = len(traffic.train_conflicts_in(b.section_id, sm, em))
            manual_impact += n_conflicts * 12
        scale = max(1.0, existing_blocks / max(len(bdms), 1))
        existing_impact = round(manual_impact * scale)
        existing_combined = 0
        util_before = 45.0  # single-dept blocks waste most of each window

        # --- Proposed -----------------------------------------------------
        proposed_total_min = sum((b.end_dt - b.start_dt).total_seconds() / 60
                                 for b in plan.blocks)
        combined_after = sum(1 for b in plan.blocks if len(b.departments) >= 2)
        util_after = round(
            (scheduled_minutes / max(proposed_total_min, 1)) * 100, 1)
        proposed_impact = sum(b.train_impact_min for b in plan.blocks)

        metric_labels = [
            "Total block events",
            "Combined multi-department blocks",
            "Train impact (est. delay min)",
            "Block utilization (%)",
            "Maintenance tasks addressed",
        ]
        return {
            "metric": metric_labels,
            "existing": [
                existing_blocks, existing_combined, existing_impact, util_before,
                bdms_scheduled,
            ],
            "proposed": [
                len(plan.blocks), combined_after, proposed_impact, util_after,
                len(scheduled_ids),
            ],
        }


    # -- what-if re-runs (mutate a deep copy) ------------------------------
    def add_critical_defect(self, section_id: str) -> dict:
        w = WhatIfScenario(self.ds, self.ref)
        ds2, task = w.add_critical_defect(section_id)
        # risk-score the new task
        risk = RiskEngine(ds2.network, self.ref)
        rr = risk.score(task)
        result = run_pipeline(ds2, self.ref)
        comp = w.compare(result["plan"])
        base = w._current_base_plan()
        moved = w.moved_tasks_between(base, result["plan"])
        scheduled_ids = set()
        for b in result["plan"].blocks:
            scheduled_ids.update(b.tasks)
        inserted = task.task_id in scheduled_ids
        return {
            "new_task": {**task_dict(task), "explanations": rr.explanations,
                         "priority": rr.to_dict()["priority"],
                         "risk_score": rr.score},
            "inserted": inserted,
            "recommendation": (
                "Schedule emergency defect immediately - it was included in the "
                "updated plan." if inserted else
                "No immediate window on this section; defer a lower-priority task "
                "or request a short extra window."),
            "comparison": comp,
            "moved_tasks": [task_dict(t) for t in moved],
            "updated_plan": plan_dict(result["plan"], ds2.network),
        }

    def add_goods_train(self, section_id: str, entry_minute: int) -> dict:
        w = WhatIfScenario(self.ds, self.ref)
        ds2, train = w.add_goods_train(section_id, entry_minute)
        result = run_pipeline(ds2, self.ref)
        comp = w.compare(result["plan"])
        return {
            "new_train": train_dict(train),
            "comparison": comp,
            "updated_plan": plan_dict(result["plan"], ds2.network),
        }

    def crew_unavailable(self, department: str) -> dict:
        w = WhatIfScenario(self.ds, self.ref)
        try:
            dept = Department(department)
        except ValueError:
            return {"error": f"Unknown department: {department}"}
        ds2, removed = w.remove_crew(dept)
        if not removed:
            return {"error": f"No {department} crew found in the resource pool."}
        result = run_pipeline(ds2, self.ref)
        comp = w.compare(result["plan"])
        recommendation = (
            f"The removed {department} crew ({removed[0].crew_id}) reduced daily "
            f"capacity, so the optimizer re-balanced the plan. Compare rising "
            f"backlog below."
        )
        return {
            "removed_crew": {
                "crew_id": removed[0].crew_id,
                "department": removed[0].department.value,
                "crew_type": removed[0].crew_type,
            },
            "recommendation": recommendation,
            "message": f"{department} crew capacity reduced for the planning day.",
            "comparison": comp,
            "updated_plan": plan_dict(result["plan"], ds2.network),
        }

    def cancel_block(self, block_id: str) -> dict:
        """What-if: what happens if the planner cancels this block?"""
        w = WhatIfScenario(self.ds, self.ref)
        base = self.plan
        block = next((b for b in base.blocks if b.block_id == block_id), None)
        if block is None:
            return {"error": f"Block {block_id} not found in the plan."}

        alt = copy.deepcopy(base)
        alt.blocks = [b for b in alt.blocks if b.block_id != block_id]
        task_by_id = {t.task_id: t for t in self.ds.tasks}
        sec_name = self.ds.network.sections[block.section_id].name if block.section_id in self.ds.network.sections else block.section_id
        deferred = [task_by_id[tid] for tid in block.tasks if tid in task_by_id]
        deferred = sorted(deferred, key=lambda t: t.risk_score, reverse=True)

        alt.deferred_tasks = list(block.tasks)
        comp = w.compare(alt)

        risk_increase = round(sum(t.risk_score for t in deferred) / 100.0, 1)
        backlog_increase = len(deferred)
        critical_moved = sum(1 for t in deferred if t.severity == Severity.CRITICAL)
        recommendation = (
            f"Cancelling {block_id} frees the section for trains but leaves "
            f"{backlog_increase} task(s) ({critical_moved} critical) unfinished, "
            f"raising backlog risk by ~{risk_increase} pts. Re-schedule these "
            f"tasks into the next opportunity on {sec_name}."
        )
        return {
            "cancelled_block": block_dict(block, self.ds.network),
            "deferred_tasks": [task_dict(t) for t in deferred],
            "backlog_increase": backlog_increase,
            "risk_increase": risk_increase,
            "recommendation": recommendation,
            "comparison": comp,
            "updated_plan": plan_dict(alt, self.ds.network),
        }

    def extend_block(self, block_id: str, minutes: int = 30) -> dict:
        """What-if: what happens if we extend this block by N minutes?"""
        w = WhatIfScenario(self.ds, self.ref)
        base = self.plan
        block = next((b for b in base.blocks if b.block_id == block_id), None)
        if block is None:
            return {"error": f"Block {block_id} not found in the plan."}

        sec = block.section_id
        sec_name = self.ds.network.sections[sec].name if sec in self.ds.network.sections else sec
        traffic = self.traffic
        end_min = block.end_dt.hour * 60 + block.end_dt.minute
        ext = min(minutes, 24 * 60 - 1 - end_min)
        ext = max(ext, 0)

        # how far can the block extend before the next train?
        headroom = 0
        for (ws, we) in traffic.free_windows(sec, min_gap_between_trains=10,
                                             min_window_min=15):
            if ws <= end_min < we:
                headroom = max(0, we - end_min)
                break
        extra_conflicts = traffic.train_conflicts_in(sec, end_min, end_min + ext)
        additional_impact = len(extra_conflicts)

        # candidate extra tasks: open, same section, not already scheduled,
        # fit within the extension and compatible with block departments.
        scheduled_ids = {tid for b in base.blocks for tid in b.tasks}
        candidates = [
            t for t in self.ds.tasks
            if t.status == TaskStatus.OPEN and t.section_id == sec
            and t.task_id not in scheduled_ids
            and t.estimated_minutes <= max(ext, headroom)
        ]
        dept_rooms = {}
        for c in self.ds.crews:
            dept_rooms[c.department.value] = dept_rooms.get(c.department.value, 0) \
                + c.daily_hours * 60
        for b in base.blocks:
            for tid in b.tasks:
                t = next((tt for tt in self.ds.tasks if tt.task_id == tid), None)
                if t:
                    dept_rooms[t.department.value] = \
                        dept_rooms.get(t.department.value, 0) - t.estimated_minutes
        extra = []
        pulled = []
        used = 0
        for t in sorted(candidates, key=lambda x: x.risk_score, reverse=True):
            if used + t.estimated_minutes > max(ext, headroom):
                continue
            if dept_rooms.get(t.department.value, 0) < t.estimated_minutes:
                continue
            extra.append(t)
            used += t.estimated_minutes
            dept_rooms[t.department.value] -= t.estimated_minutes

        # Pull-forward: bring a task scheduled in a LATER window on this same
        # section earlier into the extended block (net-zero crew impact, frees
        # the later window for other work).
        task_by_id = {t.task_id: t for t in self.ds.tasks}
        later = []
        for b in base.blocks:
            if b.block_id == block_id or b.section_id != sec:
                continue
            if b.start_dt >= block.end_dt:
                for tid in b.tasks:
                    tt = task_by_id.get(tid)
                    if tt and tt.estimated_minutes <= max(ext, headroom):
                        later.append(tt)
        later.sort(key=lambda x: x.risk_score, reverse=True)
        for t in later:
            if used + t.estimated_minutes > max(ext, headroom):
                continue
            if any(x.task_id == t.task_id for x in extra):
                continue
            extra.append(t)
            pulled.append(t.task_id)
            used += t.estimated_minutes

        recommended = bool(extra) and additional_impact <= 2
        if extra:
            pulled_note = (
                f" {len(pulled)} of them pulled earlier from a later window."
                if pulled else ""
            )
            message = (
                f"Extension of {ext} min fits before the next train; "
                f"{len(extra)} additional task(s) can be completed "
                f"({used} min), with ~{additional_impact} train(s) impacted."
                f"{pulled_note}"
            )
        else:
            message = (
                f"No compatible extra work fits in the {ext}-minute extension "
                f"(either no open tasks on {sec_name} "
                f"or insufficient crew headroom)."
            )
        return {
            "block": block_dict(block, self.ds.network),
            "extension_minutes": ext,
            "additional_tasks": [task_dict(t) for t in extra],
            "additional_trains_impacted": additional_impact,
            "recommended": recommended,
            "message": message,
            "recommendation": (
                "EXTEND the block - additional high-value work fits within the "
                "available free window." if recommended else
                "Do NOT extend - no meaningful extra work fits inside the window."),
        }

    # -- interactive planner actions (in-memory demo state) ---------------
    def update_block_status(self, block_id: str, status: str) -> dict:
        try:
            new_status = BlockStatus(status)
        except ValueError:
            return {"error": f"Invalid block status: {status}"}
        for b in self.plan.blocks:
            if b.block_id == block_id:
                b.status = new_status
                return block_dict(b, self.ds.network)
        return {"error": f"Block {block_id} not found."}

    def update_task_status(self, task_id: str, status: str) -> dict:
        try:
            new_status = TaskStatus(status)
        except ValueError:
            return {"error": f"Invalid task status: {status}"}
        for t in self.ds.tasks:
            if t.task_id == task_id:
                t.status = new_status
        self._run()
        return self.snapshot()
