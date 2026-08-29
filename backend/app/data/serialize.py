"""Serialization helpers to convert domain objects to plain dicts for the API."""
from __future__ import annotations

import datetime as dt

from app.core.models import (
    Station, Section, RailwayNetwork, MaintenanceTask, TrainService, Crew, Machine,
    Block, MaintenancePlan, OpportunityPackage, Department,
)


def section_dict(sec: Section) -> dict:
    return {
        "id": sec.id, "name": sec.name, "station_a": sec.station_a,
        "station_b": sec.station_b, "length_km": sec.length_km,
        "track_health": sec.track_health, "ohe_health": sec.ohe_health,
        "signal_health": sec.signal_health, "traffic_level": sec.traffic_level,
        "route_class": sec.route_class.value, "max_speed": sec.max_speed,
    }


def task_dict(t: MaintenanceTask) -> dict:
    return {
        "task_id": t.task_id, "source_system": t.source_system,
        "department": t.department.value, "section_id": t.section_id,
        "section_name": "", "location_km": t.location_km, "asset": t.asset,
        "defect_type": t.defect_type, "severity": t.severity.value,
        "detected_date": str(t.detected_date), "due_date": str(t.due_date),
        "estimated_minutes": t.estimated_minutes, "status": t.status.value,
        "risk_score": round(t.risk_score, 1),
        "risk_factors": t.risk_factors, "description": t.description,
    }


def train_dict(tr: TrainService) -> dict:
    return {
        "train_number": tr.train_number, "train_name": tr.train_name,
        "train_type": tr.train_type.value, "sections": tr.section_ids,
        "direction": tr.direction.value, "entry_minute": tr.entry_minute,
        "expected_delay_min": tr.expected_delay_min,
        "goods_confidence": tr.goods_forecast_confidence,
    }


def opportunity_dict(o: OpportunityPackage, network: RailwayNetwork) -> dict:
    return {
        "opportunity_id": o.opportunity_id,
        "section_id": o.section_id,
        "section_name": network.sections[o.section_id].name if o.section_id in network.sections else o.section_id,
        "start": o.start_dt.isoformat(), "end": o.end_dt.isoformat(),
        "available_window_minutes": o.available_window_minutes,
        "tasks": [task_dict(t) for t in o.tasks],
        "departments": [d.value for d in o.departments],
        "train_impact_min": o.train_impact_min,
        "opportunity_score": o.opportunity_score,
        "reasons": o.reasons,
    }


def block_dict(b: Block, network: RailwayNetwork) -> dict:
    return {
        "block_id": b.block_id, "section_id": b.section_id,
        "section_name": network.sections[b.section_id].name if b.section_id in network.sections else b.section_id,
        "start": b.start_dt.isoformat(), "end": b.end_dt.isoformat(),
        "departments": [d.value for d in b.departments],
        "tasks": b.tasks, "status": b.status.value,
        "train_impact_min": b.train_impact_min,
        "opportunity_score": b.opportunity_score, "notes": b.notes,
    }


def plan_dict(plan: MaintenancePlan, network: RailwayNetwork) -> dict:
    return {
        "horizon": plan.horizon,
        "start": plan.start_date.isoformat(), "end": plan.end_date.isoformat(),
        "kpis": plan.kpis,
        "blocks": [block_dict(b, network) for b in plan.blocks],
        "deferred_tasks": plan.deferred_tasks,
    }
