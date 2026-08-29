"""Assembles a complete synthetic dataset and exports it to CSV files that
mimic real system exports (TMS/SMMS/TDMS/COA/Resources/BDMS)."""
from __future__ import annotations

import csv
import datetime as dt
import random
import os
from typing import Optional

from app.core.models import (
    RailwayNetwork, MaintenanceTask, Department, Severity, TaskStatus,
    TrainService, TrainType, Direction, Crew, Machine, Block, BlockStatus,
)
from app.core.network import build_demo_network
from app.data.generators.synthetic import (
    TaskGenerator, generate_train_schedule, generate_resources, generate_bdms_blocks,
)


class Dataset:
    def __init__(self, network: RailwayNetwork, tasks: list[MaintenanceTask],
                 trains: list[TrainService], crews: list[Crew],
                 machines: list[Machine], bdms_blocks: list[Block],
                 today: dt.date):
        self.network = network
        self.tasks = tasks
        self.trains = trains
        self.crews = crews
        self.machines = machines
        self.bdms_blocks = bdms_blocks
        self.today = today

    @property
    def by_department(self) -> dict:
        out = {}
        for t in self.tasks:
            out.setdefault(t.department, []).append(t)
        return out


def _task_weight(t: MaintenanceTask) -> int:
    return {
        Severity.LOW: 1, Severity.MEDIUM: 2, Severity.HIGH: 3, Severity.CRITICAL: 4,
    }[t.severity]


def build_dataset(today: Optional[dt.date] = None,
                  n_weekly_tasks: int = 40,
                  seed: int = 42) -> Dataset:
    """Builds the full synthetic dataset for one week of planning."""
    today = today or dt.date(2026, 1, 5)
    network = build_demo_network()
    rng = random.Random(seed)
    gen = TaskGenerator(network, rng=rng, today=today)

    section_list = list(network.sections.keys())
    tasks: list[MaintenanceTask] = []

    # Assign tasks with bias toward sections with lower health (more defects)
    weights = []
    for sid in section_list:
        sec = network.sections[sid]
        avg_health = (sec.track_health + sec.ohe_health + sec.signal_health) / 3
        weights.append(1.0 / max(0.01, avg_health / 100))
    for _ in range(n_weekly_tasks):
        sid = rng.choices(section_list, weights=weights, k=1)[0]
        dept = rng.choice([Department.TRACK, Department.S_and_T, Department.TRACTION])
        if dept == Department.TRACK:
            tasks.append(gen.generate_tms_task(sid))
        elif dept == Department.S_and_T:
            tasks.append(gen.generate_smms_task(sid))
        else:
            tasks.append(gen.generate_tdms_task(sid))

    trains = generate_train_schedule(network, rng=random.Random(seed + 1))
    crews, machines = generate_resources(network, rng=random.Random(seed + 2))
    bdms = generate_bdms_blocks(network, today, rng=random.Random(seed + 3))

    return Dataset(network, tasks, trains, crews, machines, bdms, today)


# ---------------------------------------------------------------------------
# CSV export helpers (mimic real system export formats)
# ---------------------------------------------------------------------------
def _sec_name(net: RailwayNetwork, sid: str) -> str:
    return net.sections[sid].name if sid in net.sections else sid


def export_to_csv(ds: Dataset, out_dir: str) -> dict[str, str]:
    os.makedirs(out_dir, exist_ok=True)
    paths = {}

    # TMS
    p = os.path.join(out_dir, "tms_track_defects.csv")
    with open(p, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["task_id", "section", "location_km", "defect_type", "severity",
                    "detected_date", "due_date", "estimated_minutes", "risk_score", "status"])
        for t in ds.tasks:
            if t.source_system == "TMS":
                w.writerow([t.task_id, _sec_name(ds.network, t.section_id), t.location_km,
                            t.defect_type, t.severity.value, t.detected_date, t.due_date,
                            t.estimated_minutes, round(t.risk_score, 1), t.status.value])
    paths["tms"] = p

    # SMMS
    p = os.path.join(out_dir, "smms_signal_defects.csv")
    with open(p, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["task_id", "section", "location", "equipment_type", "defect_type",
                    "severity", "estimated_minutes", "risk_score", "status"])
        for t in ds.tasks:
            if t.source_system == "SMMS":
                w.writerow([t.task_id, _sec_name(ds.network, t.section_id), t.location_km,
                            t.equipment_type, t.defect_type, t.severity.value,
                            t.estimated_minutes, round(t.risk_score, 1), t.status.value])
    paths["smms"] = p

    # TDMS
    p = os.path.join(out_dir, "tdms_traction_defects.csv")
    with open(p, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["task_id", "section", "location", "equipment_type", "defect_type",
                    "severity", "estimated_minutes", "risk_score", "status"])
        for t in ds.tasks:
            if t.source_system == "TDMS":
                w.writerow([t.task_id, _sec_name(ds.network, t.section_id), t.location_km,
                            t.equipment_type, t.defect_type, t.severity.value,
                            t.estimated_minutes, round(t.risk_score, 1), t.status.value])
    paths["tdms"] = p

    # COA trains
    p = os.path.join(out_dir, "coa_train_schedule.csv")
    with open(p, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["train_number", "train_name", "train_type", "sections", "direction",
                    "entry_minute", "expected_delay_min", "goods_confidence"])
        for tr in ds.trains:
            w.writerow([tr.train_number, tr.train_name, tr.train_type.value,
                        "|".join(tr.section_ids), tr.direction.value, tr.entry_minute,
                        tr.expected_delay_min, tr.goods_forecast_confidence])
    paths["coa"] = p

    # Resources
    p = os.path.join(out_dir, "resources.csv")
    with open(p, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["resource_type", "resource_id", "department", "spec", "daily_capacity_hours"])
        for c in ds.crews:
            w.writerow(["crew", c.crew_id, c.department.value, c.crew_type, c.daily_hours])
        for m in ds.machines:
            w.writerow(["machine", m.machine_id, m.department.value, m.machine_type,
                        m.daily_capacity_hours])
    paths["resources"] = p

    # BDMS (current manual blocks)
    p = os.path.join(out_dir, "bdms_current_blocks.csv")
    with open(p, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["block_id", "section", "start", "end", "departments", "status"])
        for b in ds.bdms_blocks:
            w.writerow([b.block_id, _sec_name(ds.network, b.section_id),
                        b.start_dt.isoformat(), b.end_dt.isoformat(),
                        "|".join(d.value for d in b.departments), b.status.value])
    paths["bdms"] = p

    return paths


if __name__ == "__main__":
    ds = build_dataset()
    paths = export_to_csv(ds, os.path.join("data", "generated"))
    print("Exported datasets:")
    for k, v in paths.items():
        print(f"  {k}: {v}")
    print(f"  tasks: {len(ds.tasks)}  trains: {len(ds.trains)}  "
          f"crews: {len(ds.crews)}  machines: {len(ds.machines)}  "
          f"bdms blocks: {len(ds.bdms_blocks)}")
