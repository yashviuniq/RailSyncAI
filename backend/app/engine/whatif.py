"""What-if simulation and adaptive replanning.

Lets a planner explore alternatives without changing the live plan, and
recomputes an updated plan when railway conditions change (new defect, train
delay, added goods train, crew/block unavailability).
"""
from __future__ import annotations

import datetime as dt
import random
from typing import Optional

from app.core.models import (
    Department, MaintenanceTask, Severity, TaskStatus, Block, BlockStatus,
    TrainService, TrainType, Direction, MaintenancePlan,
)
from app.data.dataset import Dataset
from app.engine.risk import RiskEngine
from app.engine.opportunity import OpportunityEngine
from app.engine.optimizer import BlockOptimizer
from app.engine.traffic import TrafficModel


def run_pipeline(ds: Dataset, reference_date: dt.date,
                 max_os_hours: float = 3.0) -> dict:
    """Runs the full engine: risk -> opportunities -> optimized plan."""
    risk = RiskEngine(ds.network, reference_date)
    risk_results = risk.score_all(ds.tasks)

    traffic = TrafficModel(ds.trains)
    opp_engine = OpportunityEngine(ds.network, traffic, reference_date=dt.datetime.combine(
        reference_date, dt.time(0, 0)))
    opportunities = opp_engine.find_opportunities(ds.tasks)

    optimizer = BlockOptimizer(max_os_hours=max_os_hours)
    plan = optimizer.optimize(opportunities, reference_date)
    return {
        "risk_results": risk_results,
        "opportunities": opportunities,
        "plan": plan,
        "traffic": traffic,
    }


class WhatIfScenario:
    """Applies a mutation to the dataset and re-runs the pipeline for comparison."""

    def __init__(self, ds: Dataset, reference_date: dt.date):
        self.base_ds = ds
        self.ref = reference_date

    def add_critical_defect(self, section_id: str, defect_type: str = "Rail fracture",
                            severity: Severity = Severity.CRITICAL,
                            minutes: int = 180, due_in_days: int = 1,
                            description: str = "Emergency track defect") -> MaintenanceTask:
        """Injects a new critical defect into a working copy of the data."""
        ds = self._copy()
        task = MaintenanceTask(
            task_id="EMG-0001", source_system="TMS", department=Department.TRACK,
            section_id=section_id, location_km=12.0, asset="Track",
            defect_type=defect_type, severity=severity,
            detected_date=self.ref, due_date=self.ref + dt.timedelta(days=due_in_days),
            estimated_minutes=minutes, status=TaskStatus.OPEN,
            route_class=ds.network.sections[section_id].route_class.value,
            traffic_level=ds.network.sections[section_id].traffic_level,
            age_days=0, description=description,
        )
        ds.tasks.append(task)
        return ds, task

    def add_goods_train(self, section_id: str, entry_minute: int = 140) -> TrainService:
        """Adds a goods train occupying a section (simulating a COA forecast)."""
        ds = self._copy()
        train = TrainService(
            train_number="G-EXTRA", train_name="Extra Goods", train_type=TrainType.GOODS,
            section_ids=[section_id], direction=Direction.UP, entry_minute=entry_minute,
            goods_forecast_confidence=0.7,
        )
        ds.trains.append(train)
        return ds, train

    def _copy(self) -> Dataset:
        import copy
        ds = copy.deepcopy(self.base_ds)
        return ds

    def compare(self, mutated_plan: MaintenancePlan) -> dict:
        """Builds a before/after comparison between base and mutated plan."""
        base = self._current_base_plan()
        return {
            "current": self._plan_summary(base),
            "alternative": self._plan_summary(mutated_plan),
        }

    def _current_base_plan(self) -> MaintenancePlan:
        result = run_pipeline(self.base_ds, self.ref)
        return result["plan"]

    def _plan_summary(self, plan: MaintenancePlan) -> dict:
        unique_tasks = set()
        for b in plan.blocks:
            unique_tasks.update(b.tasks)
        return {
            "blocks": len(plan.blocks),
            "tasks": len(unique_tasks),
            "combined_blocks": sum(1 for b in plan.blocks if len(b.departments) >= 2),
            "train_impact_min": sum(b.train_impact_min for b in plan.blocks),
            "total_block_min": round(sum((b.end_dt - b.start_dt).total_seconds() / 60
                                         for b in plan.blocks)),
        }
