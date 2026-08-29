"""Synthetic data generators for TMS, SMMS, TDMS, COA, Resources and BDMS.

These mimic the schema and behaviour of the real Indian Railways systems so the
orchestrator can be developed and demonstrated without access to live data.
All data is clearly synthetic/prototype data.
"""
from __future__ import annotations

import datetime as dt
import random
from typing import Optional

from app.core.models import (
    Department, Severity, TaskStatus, MaintenanceTask, TrainService, TrainType,
    Direction, Crew, Machine, Block, BlockStatus, RailwayNetwork,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _rand_date(start: dt.date, delta_days: int, rng: random.Random) -> dt.date:
    return start + dt.timedelta(days=rng.randint(0, delta_days))


def _pick_weighted(options: list, weights: list, rng: random.Random):
    return rng.choices(options, weights=weights, k=1)[0]


SEVERITY_WEIGHTS = {
    Severity.LOW: 30,
    Severity.MEDIUM: 40,
    Severity.HIGH: 22,
    Severity.CRITICAL: 8,
}


class TaskGenerator:
    """Generates maintenance tasks from a given department/source system."""

    def __init__(self, network: RailwayNetwork, rng: Optional[random.Random] = None,
                 today: Optional[dt.date] = None):
        self.network = network
        self.rng = rng or random.Random(42)
        self.today = today or dt.date(2026, 1, 5)  # a Monday
        self._counter = 0

    def _id(self, prefix: str) -> str:
        self._counter += 1
        return f"{prefix}-{self._counter:04d}"

    # -- Track (TMS) -------------------------------------------------------
    def generate_tms_task(self, section_id: str) -> MaintenanceTask:
        sec = self.network.sections[section_id]
        severity = _pick_weighted(
            [Severity.LOW, Severity.MEDIUM, Severity.HIGH, Severity.CRITICAL],
            [SEVERITY_WEIGHTS[s] for s in
             [Severity.LOW, Severity.MEDIUM, Severity.HIGH, Severity.CRITICAL]],
            self.rng,
        )
        defect_type = _pick_weighted(
            ["Rail fracture", "Track geometry", "Speed restriction", "Ballast issue",
             "Tamping required", "Joint gap", "Drainage defect"],
            [18, 25, 15, 14, 12, 9, 7], self.rng,
        )
        dur_map = {
            "Rail fracture": (180, 360), "Track geometry": (120, 300),
            "Speed restriction": (150, 330), "Ballast issue": (90, 240),
            "Tamping required": (150, 300), "Joint gap": (60, 150),
            "Drainage defect": (90, 210),
        }
        lo, hi = dur_map[defect_type]
        duration = self.rng.randint(lo, hi)
        due_offset = self.rng.randint(0, 6)
        detected = _rand_date(self.today - dt.timedelta(days=25), 25, self.rng)
        due = detected + dt.timedelta(days=due_offset + self.rng.randint(1, 8))
        task = MaintenanceTask(
            task_id=self._id("TMS"),
            source_system="TMS",
            department=Department.TRACK,
            section_id=section_id,
            location_km=round(self.rng.uniform(0.5, sec.length_km - 0.5), 1),
            asset="Track",
            defect_type=defect_type,
            severity=severity,
            detected_date=detected,
            due_date=due,
            estimated_minutes=duration,
            status=TaskStatus.OPEN,
            route_class=sec.route_class.value,
            traffic_level=sec.traffic_level,
            age_days=(self.today - detected).days,
            description=f"{defect_type} at km {0.0:.1f} on {sec.name}",
        )
        task.description = f"{defect_type} at km {task.location_km} on {sec.name}"
        return task

    # -- Signal & Telecom (SMMS) ------------------------------------------
    def generate_smms_task(self, section_id: str) -> MaintenanceTask:
        sec = self.network.sections[section_id]
        severity = _pick_weighted(
            [Severity.LOW, Severity.MEDIUM, Severity.HIGH, Severity.CRITICAL],
            [35, 38, 20, 7], self.rng)
        defect_type = _pick_weighted(
            ["Signal failure", "Points defect", "Level crossing gate",
             "Track circuit fault", "Interlocking issue", "Telecom fiber"],
            [22, 24, 18, 16, 12, 8], self.rng)
        dur_map = {
            "Signal failure": (45, 120), "Points defect": (60, 150),
            "Level crossing gate": (90, 180), "Track circuit fault": (45, 120),
            "Interlocking issue": (90, 180), "Telecom fiber": (60, 150),
        }
        lo, hi = dur_map[defect_type]
        duration = self.rng.randint(lo, hi)
        detected = _rand_date(self.today - dt.timedelta(days=20), 20, self.rng)
        due = detected + dt.timedelta(days=self.rng.randint(1, 8))
        task = MaintenanceTask(
            task_id=self._id("SMMS"), source_system="SMMS",
            department=Department.S_and_T, section_id=section_id,
            location_km=round(self.rng.uniform(0.5, sec.length_km - 0.5), 1),
            asset=self._asset_for_smms(defect_type), defect_type=defect_type,
            severity=severity, detected_date=detected, due_date=due,
            estimated_minutes=duration, status=TaskStatus.OPEN,
            equipment_type=defect_type, route_class=sec.route_class.value,
            traffic_level=sec.traffic_level,
            age_days=(self.today - detected).days,
            description=f"{defect_type} on {sec.name}",
        )
        return task

    @staticmethod
    def _asset_for_smms(defect_type: str) -> str:
        mapping = {
            "Signal failure": "Signal", "Points defect": "Points",
            "Level crossing gate": "Level Crossing", "Track circuit fault": "Track Circuit",
            "Interlocking issue": "Interlocking", "Telecom fiber": "Telecom",
        }
        return mapping.get(defect_type, "Signal")

    # -- Traction / OHE (TDMS) --------------------------------------------
    def generate_tdms_task(self, section_id: str) -> MaintenanceTask:
        sec = self.network.sections[section_id]
        severity = _pick_weighted(
            [Severity.LOW, Severity.MEDIUM, Severity.HIGH, Severity.CRITICAL],
            [33, 38, 21, 8], self.rng)
        defect_type = _pick_weighted(
            ["OHE disconnection", "Pantograph issue", "Substation fault",
             "Feeder issue", "Overhead tension", "Insulator failure"],
            [20, 15, 15, 18, 17, 15], self.rng)
        dur_map = {
            "OHE disconnection": (60, 150), "Pantograph issue": (30, 90),
            "Substation fault": (90, 180), "Feeder issue": (45, 120),
            "Overhead tension": (60, 150), "Insulator failure": (45, 120),
        }
        lo, hi = dur_map[defect_type]
        duration = self.rng.randint(lo, hi)
        detected = _rand_date(self.today - dt.timedelta(days=22), 22, self.rng)
        due = detected + dt.timedelta(days=self.rng.randint(1, 8))
        task = MaintenanceTask(
            task_id=self._id("TDMS"), source_system="TDMS",
            department=Department.TRACTION, section_id=section_id,
            location_km=round(self.rng.uniform(0.5, sec.length_km - 0.5), 1),
            asset=self._asset_for_tdms(defect_type), defect_type=defect_type,
            severity=severity, detected_date=detected, due_date=due,
            estimated_minutes=duration, status=TaskStatus.OPEN,
            equipment_type=defect_type, route_class=sec.route_class.value,
            traffic_level=sec.traffic_level,
            age_days=(self.today - detected).days,
            description=f"{defect_type} on {sec.name}",
        )
        return task

    @staticmethod
    def _asset_for_tdms(defect_type: str) -> str:
        mapping = {
            "OHE disconnection": "OHE", "Pantograph issue": "OHE",
            "Substation fault": "Substation", "Feeder issue": "Feeder",
            "Overhead tension": "OHE", "Insulator failure": "OHE",
        }
        return mapping.get(defect_type, "OHE")


# ---------------------------------------------------------------------------
# COA / Train schedule
# ---------------------------------------------------------------------------
TRAIN_TYPES = [
    (TrainType.SUPERFAST, "Rajdhani", 0.25),
    (TrainType.PASSENGER, "Passenger", 0.35),
    (TrainType.GOODS, "Goods", 0.40),
]


def generate_train_schedule(network: RailwayNetwork,
                            rng: Optional[random.Random] = None) -> list:
    """Generates a representative day of train services over the corridor."""
    rng = rng or random.Random(7)
    trains = []
    n = 0
    count = rng.randint(38, 48)  # total services on the corridor per day
    section_ids = list(network.sections.keys())
    for _ in range(count):
        n += 1
        ttype, name, _w = rng.choices(
            TRAIN_TYPES, weights=[w for _, _, w in TRAIN_TYPES], k=1)[0]
        num = str(1 + n) if not ttype == TrainType.GOODS else str(12000 + n)
        direction = rng.choice([Direction.UP, Direction.DOWN])
        entry = rng.randint(0, 24 * 60 - 1)
        delay = rng.randint(0, 12) if rng.random() < 0.4 else 0
        conf = round(rng.uniform(0.6, 0.95), 2) if ttype == TrainType.GOODS else 1.0
        # train traverses a random contiguous subset of sections
        start_idx = rng.randint(0, max(0, len(section_ids) - 1))
        length = rng.randint(1, 3)
        used = []
        for i in range(start_idx, min(start_idx + length, len(section_ids))):
            used.append(section_ids[i])
        trains.append(TrainService(
            train_number=num, train_name=f"{name} {num}", train_type=ttype,
            section_ids=used, direction=direction, entry_minute=entry,
            expected_delay_min=delay, goods_forecast_confidence=conf,
        ))
    return trains


# ---------------------------------------------------------------------------
# Resources
# ---------------------------------------------------------------------------
def generate_resources(network: RailwayNetwork,
                       rng: Optional[random.Random] = None) -> tuple[list, list]:
    rng = rng or random.Random(11)
    crews = []
    machines = []
    for dept in (Department.TRACK, Department.S_and_T, Department.TRACTION):
        for i in range(rng.randint(2, 3)):
            crews.append(Crew(
                crew_id=f"{dept.value[:2]}-C{i}",
                department=dept,
                crew_type=rng.choice(["General", "Specialist", "Line"]),
            ))
        for j in range(rng.randint(1, 2)):
            machines.append(Machine(
                machine_id=f"{dept.value[:2]}-M{j}",
                department=dept,
                machine_type=rng.choice(["Tamping Machine", "OHE Car", "Crane"]),
            ))
    return crews, machines


# ---------------------------------------------------------------------------
# BDMS - current manual/decentralized blocks (for before/after comparison)
# ---------------------------------------------------------------------------
def generate_bdms_blocks(network: RailwayNetwork, today: dt.date,
                         rng: Optional[random.Random] = None) -> list:
    """Generates 'current manual' blocks - one dept per block, poorly coordinated."""
    rng = rng or random.Random(3)
    blocks = []
    n = 0
    for sec in network.sections.values():
        # each department independently asks for blocks on the corridor
        for dept in (Department.TRACK, Department.S_and_T, Department.TRACTION):
            if rng.random() < 0.75:
                n += 1
                day_offset = rng.randint(0, 6)
                start_h = rng.choice([2, 3, 4, 10, 11, 12, 13])
                dur = rng.choice([2, 3, 4])
                start = dt.datetime.combine(today + dt.timedelta(days=day_offset),
                                            dt.time(start_h, 0))
                blocks.append(Block(
                    block_id=f"BDMS-{n:03d}", section_id=sec.id,
                    start_dt=start, end_dt=start + dt.timedelta(hours=dur),
                    departments=[dept],
                    status=BlockStatus.RECOMMENDED,
                    notes="Manual independent request",
                ))
    return blocks
