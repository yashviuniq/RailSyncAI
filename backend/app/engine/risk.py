"""Explainable risk scoring engine for maintenance tasks.

Produces a 0-100 risk/priority score for each task based on weighted, auditable
factors, plus a human-readable explanation of WHY the score was assigned.

Score components (all normalized 0-100 weights sum to 1.0):
    severity       30%  - how severe/impactful the defect is
    safety         20%  - safety-criticality of the asset/location
    urgency(age)   15%  - how overdue / close to due date
    traffic        15%  - impact if the section's traffic is disrupted
    route_importance 12% - A/B/C/D route class
    asset_critical 8%   - asset type criticality
"""
from __future__ import annotations

import datetime as dt
from dataclasses import dataclass
from typing import Optional

from app.core.models import MaintenanceTask, Severity, RouteClass, RailwayNetwork

WEIGHTS = {
    "severity": 0.30,
    "safety": 0.20,
    "urgency": 0.15,
    "traffic": 0.15,
    "route": 0.12,
    "asset": 0.08,
}

SEVERITY_SCORE = {
    Severity.LOW: 25, Severity.MEDIUM: 55, Severity.HIGH: 80, Severity.CRITICAL: 100,
}

ROUTE_SCORE = {RouteClass.A: 100, RouteClass.B: 75, RouteClass.C: 50, RouteClass.D: 30}

TRAFFIC_SCORE = {"LOW": 25, "MEDIUM": 50, "HIGH": 75, "VERY_HIGH": 100}

# Asset criticality: how risky it is for this asset to fail on a running line
ASSET_CRITICALITY = {
    "Track": 80, "Points": 95, "Signal": 90, "Interlocking": 100,
    "Level Crossing": 90, "Track Circuit": 75, "OHE": 85, "Substation": 90,
    "Feeder": 70, "Telecom": 55,
}

# Safety weights: how directly a defect can cause an accident
SAFETY_BY_TYPE = {
    "Rail fracture": 100, "Points defect": 90, "Signal failure": 95,
    "Level crossing gate": 95, "Interlocking issue": 100, "Track circuit fault": 80,
    "OHE disconnection": 60, "Substation fault": 70, "Pantograph issue": 55,
    "Overhead tension": 55, "Insulator failure": 50, "Drainage defect": 40,
    "Ballast issue": 55, "Track geometry": 65, "Speed restriction": 60,
    "Tamping required": 55, "Joint gap": 70, "Feeder issue": 55, "Telecom fiber": 35,
}

SEVERITY_LABEL = {
    Severity.LOW: "low", Severity.MEDIUM: "medium",
    Severity.HIGH: "high", Severity.CRITICAL: "critical",
}


@dataclass
class RiskResult:
    task_id: str
    score: float
    factors: dict[str, float]
    explanations: list[str]

    def to_dict(self) -> dict:
        return {
            "task_id": self.task_id,
            "risk_score": round(self.score, 1),
            "priority": priority_label(self.score),
            "factors": {k: round(v) for k, v in self.factors.items()},
            "explanations": self.explanations,
        }


def priority_label(score: float) -> str:
    if score >= 80:
        return "CRITICAL"
    if score >= 60:
        return "HIGH"
    if score >= 40:
        return "MEDIUM"
    return "LOW"


class RiskEngine:
    """Computes explainable risk scores for tasks against a network."""

    def __init__(self, network: RailwayNetwork, reference_date: Optional[dt.date] = None):
        self.network = network
        self.reference_date = reference_date or dt.date.today()

    def score(self, task: MaintenanceTask) -> RiskResult:
        sev = SEVERITY_SCORE.get(task.severity, 50)

        sec = self.network.sections.get(task.section_id)
        route = sec.route_class if sec else RouteClass.C
        traffic = sec.traffic_level if sec else "MEDIUM"
        route_s = ROUTE_SCORE.get(route, 60)
        traffic_s = TRAFFIC_SCORE.get(traffic, 50)
        asset_s = ASSET_CRITICALITY.get(task.asset, 60)
        safety_s = SAFETY_BY_TYPE.get(task.defect_type, 50)

        # urgency: overdue strongly raises score, approaching due date gradually
        days_overdue = (self.reference_date - task.due_date).days
        if days_overdue > 0:
            urgen = min(100, 55 + days_overdue * 8)
        else:
            # -days is how many days remaining
            remaining = -days_overdue
            if remaining <= 1:
                urgen = 75
            elif remaining <= 3:
                urgen = 50
            else:
                urgen = 25

        factors = {
            "severity": sev,
            "safety": safety_s,
            "urgency": urgen,
            "traffic": traffic_s,
            "route": route_s,
            "asset": asset_s,
        }
        score = sum(factors[k] * WEIGHTS[k] for k in WEIGHTS)

        task.risk_score = score
        task.risk_factors = {k: round(v) for k, v in factors.items()}

        explanations = self._explain(task, factors, days_overdue, traffic)
        return RiskResult(task.task_id, score, factors, explanations)

    def _explain(self, task: MaintenanceTask, factors: dict, days_overdue: int,
                 traffic: str) -> list[str]:
        e = []
        e.append(f"Severity is {SEVERITY_LABEL[task.severity]} "
                 f"({factors['severity']}/100, weight 30%).")
        e.append(f"Defect type '{task.defect_type}' has safety-criticality "
                 f"{factors['safety']}/100 (weight 20%).")
        if days_overdue > 0:
            e.append(f"Defect is overdue by {days_overdue} day(s) "
                     f"(urgency {factors['urgency']}/100, weight 15%).")
        else:
            e.append(f"Defect due in {-days_overdue} day(s), "
                     f"urgency {factors['urgency']}/100 (weight 15%).")
        e.append(f"Section traffic is {traffic} ({factors['traffic']}/100, weight 15%).")
        e.append(f"Section route class {task.route_class} "
                 f"({factors['route']}/100, weight 12%).")
        e.append(f"Asset '{task.asset}' criticality {factors['asset']}/100 (weight 8%).")
        return e

    def score_all(self, tasks: list[MaintenanceTask]) -> dict[str, RiskResult]:
        return {t.task_id: self.score(t) for t in tasks}
