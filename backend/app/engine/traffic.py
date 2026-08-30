"""Maintenance Opportunity engine.

Core innovation: rather than "maintenance request -> block", we find every
available low-traffic railway window (a "Maintenance Opportunity"), determine
which compatible maintenance tasks can run inside it, bundle work from multiple
departments into a single coordinated block, and score the opportunity.

Inputs:
  - train schedule (COA) -> occupancy per section per time slot
  - maintenance tasks (TMS/SMMS/TDMS) + risk scores
  - resource availability
Outputs:
  - list of OpportunityPackage with bundled, coordinated work + explainable score
"""
from __future__ import annotations

import datetime as dt
import math
from typing import Optional

from app.core.models import (
    Department, MaintenanceTask, OpportunityPackage, TrainService,
    Direction, TrainType,
)

SLOT_MIN = 15  # planning granularity in minutes


def _to_slot(minute: int) -> int:
    return int(minute // SLOT_MIN)


def _dt_to_minutes(d: dt.datetime) -> float:
    return d.hour * 60 + d.minute + d.second / 60.0


class TrafficModel:
    """Computes per-section, per-slot occupancy from the train schedule."""

    def __init__(self, trains: list[TrainService], slot_min: int = SLOT_MIN):
        self.trains = trains
        self.slot_min = slot_min
        # section_id -> {slot_idx: set of train_numbers present}
        self.occupancy: dict[str, dict[int, set]] = {}
        self._build()

    def _occupy(self, section_id: str, enter_min: int, traverse_min: int,
                train_number: str):
        occ = self.occupancy.setdefault(section_id, {})
        s = _to_slot(enter_min)
        e = _to_slot(enter_min + traverse_min)
        for slot in range(s, e + 1):
            occ.setdefault(slot, set()).add(train_number)

    def _build(self):
        # estimate traverse time ~ 4 min per 10km roughly, scaled
        for tr in self.trains:
            for sec_id in tr.section_ids:
                # approximate section traversal by train type
                base = 15 if tr.train_type in (TrainType.PASSENGER, TrainType.LOCAL) else 12
                traverse = base
                self._occupy(sec_id, tr.entry_minute, traverse, tr.train_number)

    def free_windows(self, section_id: str, min_gap_between_trains: int = 20,
                     min_window_min: int = 60) -> list[tuple[int, int]]:
        """Returns list of (start_minute, end_minute) continuous free windows.

        A window is free if no train occupies any slot within it. The window is
        shrunk by a safety buffer (gap) from the nearest trains.
        """
        occ = self.occupancy.get(section_id, {})
        occupied_slots = set(occ.keys())
        max_slot = 24 * 60 // self.slot_min
        free_windows = []
        cur_start = None
        buffer = min(min_gap_between_trains, self.slot_min)
        for slot in range(max_slot + 1):
            if slot not in occupied_slots:
                if cur_start is None:
                    cur_start = slot
            else:
                if cur_start is not None:
                    start = cur_start * self.slot_min + buffer
                    end = slot * self.slot_min - buffer
                    if end - start >= min_window_min:
                        free_windows.append((start, end))
                    cur_start = None
        if cur_start is not None:
            start = cur_start * self.slot_min + buffer
            end = (max_slot + 1) * self.slot_min - buffer
            if end - start >= min_window_min:
                free_windows.append((start, end))
        return free_windows

    def train_conflicts_in(self, section_id: str, start_min: int, end_min: int) -> list[str]:
        """Train numbers that overlap the window (would be impacted)."""
        occ = self.occupancy.get(section_id, {})
        affected = []
        for slot in range(_to_slot(start_min), _to_slot(end_min) + 1):
            for num in occ.get(slot, []):
                if num not in affected:
                    affected.append(num)
        return affected

    def nearby_trains(self, section_id: str, start_min: int, end_min: int,
                      pad_min: int = 30) -> list[str]:
        """Unique train numbers passing just before/after the window (within pad).

        These trains are not blocked, but crews/patrols in the section may
        impose a small speed-restriction impact -- used for an honest estimate
        of 'expected train impact' for a maintenance block.
        """
        occ = self.occupancy.get(section_id, {})
        nearby = []
        for slot in range(_to_slot(max(0, start_min - pad_min)),
                           _to_slot(end_min + pad_min) + 1):
            for num in occ.get(slot, []):
                if num not in nearby:
                    nearby.append(num)
        return nearby
