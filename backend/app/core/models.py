"""Core domain models for the Railway Maintenance Orchestrator."""
from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------
class Department(str, Enum):
    TRACK = "Engineering"
    S_and_T = "S&T"
    TRACTION = "Electrical"


class Severity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class TaskStatus(str, Enum):
    OPEN = "OPEN"
    PLANNED = "PLANNED"
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    DEFERRED = "DEFERRED"


class BlockStatus(str, Enum):
    DRAFT = "DRAFT"
    RECOMMENDED = "RECOMMENDED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"


class RouteClass(str, Enum):
    """Indian Railways route classification by importance."""
    A = "A"
    B = "B"
    C = "C"
    D = "D"


class TrainType(str, Enum):
    PASSENGER = "PASSENGER"
    GOODS = "GOODS"
    SUPERFAST = "SUPERFAST"
    RAJDHANI = "RAJDHANI"
    LOCAL = "LOCAL"
    SHUTTLE = "SHUTTLE"


class Direction(str, Enum):
    UP = "UP"
    DOWN = "DOWN"


# ---------------------------------------------------------------------------
# Network model
# ---------------------------------------------------------------------------
@dataclass
class Station:
    id: str
    name: str

    def __hash__(self):
        return hash(self.id)


@dataclass
class Section:
    """A track corridor between two stations - the main blockable unit."""
    id: str
    station_a: str          # station id
    station_b: str          # station id
    length_km: float
    track_health: float     # 0-100
    ohe_health: float       # 0-100
    signal_health: float    # 0-100
    traffic_level: str      # LOW / MEDIUM / HIGH / VERY_HIGH
    route_class: RouteClass = RouteClass.B
    max_speed: int = 100

    @property
    def name(self) -> str:
        return f"{self.station_a}-{self.station_b}"

    def __hash__(self):
        return hash(self.id)


@dataclass
class RailwayNetwork:
    stations: dict[str, Station] = field(default_factory=dict)
    sections: dict[str, Section] = field(default_factory=dict)
    graph: dict[str, list] = field(default_factory=dict)  # station_id -> list of section ids

    def add_station(self, s: Station) -> None:
        self.stations[s.id] = s
        self.graph.setdefault(s.id, [])

    def add_section(self, sec: Section) -> None:
        self.sections[sec.id] = sec
        self.graph.setdefault(sec.station_a, []).append(sec.id)
        self.graph.setdefault(sec.station_b, []).append(sec.id)


# ---------------------------------------------------------------------------
# Maintenance tasks (from TMS/SMMS/TDMS)
# ---------------------------------------------------------------------------
@dataclass
class MaintenanceTask:
    """A single maintenance requirement originating from one department."""
    task_id: str
    source_system: str          # TMS / SMMS / TDMS
    department: Department
    section_id: str
    location_km: float
    asset: str                  # e.g. "Track", "Signal", "OHE", "Points"
    defect_type: str
    severity: Severity
    detected_date: dt.date
    due_date: dt.date
    estimated_minutes: int
    status: TaskStatus = TaskStatus.OPEN
    risk_score: float = 0.0
    risk_factors: dict = field(default_factory=dict)
    # optional populated fields
    description: str = ""
    equipment_type: str = ""
    route_class: str = ""
    traffic_level: str = ""
    age_days: int = 0


# ---------------------------------------------------------------------------
# COA / Train data
# ---------------------------------------------------------------------------
@dataclass
class TrainService:
    train_number: str
    train_name: str
    train_type: TrainType
    section_ids: list[str]
    direction: Direction
    # time of entry to the corridor (minutes from midnight), per day index
    # We support one representative day; extension to 7 days is trivial.
    entry_minute: int
    expected_delay_min: int = 0
    goods_forecast_confidence: float = 1.0  # only meaningful for goods

    @property
    def is_goods(self) -> bool:
        return self.train_type == TrainType.GOODS


# ---------------------------------------------------------------------------
# Resources
# ---------------------------------------------------------------------------
@dataclass
class Crew:
    crew_id: str
    department: Department
    crew_type: str
    daily_hours: int = 8
    shift_start_minute: int = 6 * 60
    shift_end_minute: int = 22 * 60


@dataclass
class Machine:
    machine_id: str
    department: Department
    machine_type: str
    daily_capacity_hours: float = 8.0


# ---------------------------------------------------------------------------
# Blocks & opportunities
# ---------------------------------------------------------------------------
@dataclass
class Block:
    block_id: str
    section_id: str
    start_dt: dt.datetime
    end_dt: dt.datetime
    departments: list[Department]
    tasks: list[str] = field(default_factory=list)
    status: BlockStatus = BlockStatus.RECOMMENDED
    train_impact_min: int = 0
    opportunity_score: float = 0.0
    notes: str = ""


# ---------------------------------------------------------------------------
# KPI / plan containers
# ---------------------------------------------------------------------------
@dataclass
class MaintenancePlan:
    horizon: str                 # WEEK / MONTH
    start_date: dt.date
    end_date: dt.date
    blocks: list[Block] = field(default_factory=list)
    kpis: dict = field(default_factory=dict)
    deferred_tasks: list[str] = field(default_factory=list)


@dataclass
class OpportunityPackage:
    """A maintenance opportunity + the bundled tasks assigned to it."""
    opportunity_id: str
    section_id: str
    start_dt: dt.datetime
    end_dt: dt.datetime
    available_window_minutes: int
    tasks: list[MaintenanceTask] = field(default_factory=list)
    departments: list[Department] = field(default_factory=list)
    train_impact_min: int = 0
    opportunity_score: float = 0.0
    reasons: list[str] = field(default_factory=list)
    block: Optional[Block] = None
