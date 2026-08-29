"""Default railway network configuration for the demo corridor."""
from __future__ import annotations

from app.core.models import (
    RailwayNetwork, Station, Section, RouteClass,
)


def build_demo_network() -> RailwayNetwork:
    """
    Builds the demo corridor:

        [NDLS]--(SEC-A)--[KP]--(SEC-B)--[JUDW]--(SEC-C)--[CNB]--(SEC-D)--[LKO]
    """
    net = RailwayNetwork()

    stations = [
        Station("NDLS", "New Delhi"),
        Station("KP", "Karnal"),
        Station("JUDW", "Jundla"),
        Station("CNB", "Kanpur"),
        Station("LKO", "Lucknow"),
    ]
    for s in stations:
        net.add_station(s)

    sections = [
        Section(id="SEC-A", station_a="NDLS", station_b="KP",
                length_km=124.0, track_health=78, ohe_health=86,
                signal_health=91, traffic_level="VERY_HIGH", route_class=RouteClass.A,
                max_speed=130),
        Section(id="SEC-B", station_a="KP", station_b="JUDW",
                length_km=98.0, track_health=65, ohe_health=72,
                signal_health=84, traffic_level="HIGH", route_class=RouteClass.A,
                max_speed=130),
        Section(id="SEC-C", station_a="JUDW", station_b="CNB",
                length_km=112.0, track_health=81, ohe_health=90,
                signal_health=88, traffic_level="MEDIUM", route_class=RouteClass.B,
                max_speed=100),
        Section(id="SEC-D", station_a="CNB", station_b="LKO",
                length_km=132.0, track_health=58, ohe_health=67,
                signal_health=76, traffic_level="MEDIUM", route_class=RouteClass.B,
                max_speed=100),
    ]
    for sec in sections:
        net.add_section(sec)

    return net
