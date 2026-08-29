"""Demo runner - walks through the 12-step SIH demonstration story on the CLI.

Run:
    python scripts/demo.py
"""
from __future__ import annotations

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.engine.orchestrator import Orchestrator

LINE = "=" * 78


def step(title: str):
    print(f"\n{LINE}\n  STEP: {title}\n{LINE}")


def main():
    o = Orchestrator(seed=42, n_tasks=45)
    s = o.snapshot()
    net = s["network"]
    kpis = o.kpis()
    ba = o.before_after()

    print(LINE)
    print("   RAILWAY MAINTENANCE ORCHESTRATOR - AUTOMATIC BLOCK PLANNING")
    print("   AI-powered maximization of asset availability for train ops")
    print("   (prototype on synthetic data - real systems data is protected)")
    print(LINE)

    step("1. Railway corridor (Digital Twin)")
    for sec in net["sections"]:
        print(f"   {sec['name']:<14} {sec['length_km']:>5} km  traffic={sec['traffic_level']:<10} "
              f"class={sec['route_class']}  T:{sec['track_health']} O:{sec['ohe_health']} S:{sec['signal_health']}")

    step("2. Incoming maintenance data from TMS / SMMS / TDMS")
    from collections import Counter
    src = Counter(t["source_system"] for t in s["tasks"])
    sev = Counter(t["severity"] for t in s["tasks"])
    print(f"   Total tasks: {len(s['tasks'])}  by source: {dict(src)}")
    print(f"   By severity: {dict(sev)}")

    step("3. Example maintenance tasks (sample)")
    for t in s["tasks"][:5]:
        print(f"   {t['task_id']:<10} {t['source_system']:<5} {t['department']:<12} "
              f"{t['severity']:<8} {t['description']}")

    step("4. AI risk / priority scoring (explainable)")
    for t in sorted(s["tasks"], key=lambda x: x["risk_score"], reverse=True)[:5]:
        print(f"   {t['task_id']:<10} score={t['risk_score']:>5.1f}  priority={t.get('priority','')}")
        print(f"     why: {t['explanations'][0] if t.get('explanations') else ''}")

    step("5. Available railway windows (from COA train schedule) per section")
    # recompute windows
    from app.engine.traffic import TrafficModel
    trmodel = TrafficModel(o.ds.trains)
    for sec in net["sections"]:
        wins = trmodel.free_windows(sec["id"])
        print(f"   {sec['id']}: " + ", ".join(
            f"{x//60}:{x%60:02d}->{y//60}:{y%60:02d} ({y-x}m)" for x, y in wins))

    step("6 & 7. Maintenance opportunities found + multi-department bundling")
    for opp in s["opportunities"][:6]:
        print(f"   {opp['opportunity_id']:<8} {opp['section_name']:<14} "
              f"{opp['start'][11:16]}->{opp['end'][11:16]}  score={opp['opportunity_score']:>4} "
              f"depts={'+'.join(opp['departments'])}")
        for r in opp["reasons"]:
            print(f"        - {r}")

    step("8 & 9. CP-SAT block optimizer -> weekly plan + metrics")
    print(f"   Blocks: {len(s['weekly_plan']['blocks'])}  "
          f"Tasks scheduled: {kpis['tasks_scheduled']}")
    for b in s["weekly_plan"]["blocks"]:
        print(f"   {b['block_id']:<10} {b['section_name']:<14} {b['start'][11:16]}->{b['end'][11:16]} "
              f"{'+'.join(b['departments'])}  {len(b['tasks'])} tasks")

    step("10. Before vs After (existing manual BDMS vs proposed)")
    # metrics where HIGHER is better
    higher_is_better = {"Combined multi-department blocks", "Maintenance tasks addressed",
                        "Block utilization (%)"}
    for metric, old, new in zip(ba["metric"], ba["existing"], ba["proposed"]):
        if metric in higher_is_better:
            marker = "(better)" if new > old else ("(worse)" if new < old else "(same)")
        else:
            marker = "(lower better)" if new < old else ("(higher - more coverage)" if new > old else "(same)")
        print(f"   {metric:<32} existing={old:<6} proposed={new:<6} {marker}")

    step("11 & 12. Real-time replanning: critical defect in SEC-B")
    r = o.add_critical_defect("SEC-B")
    print(f"   Emergency: {r['new_task']['description']}")
    print(f"   Risk score: {r['new_task']['risk_score']:.1f} "
          f"({r['new_task']['priority']})  inserted={r['inserted']}")
    print(f"   Recommendation: {r['recommendation']}")
    cur, alt = r["comparison"]["current"], r["comparison"]["alternative"]
    print(f"   plan: blocks {cur['blocks']}->{alt['blocks']}, "
          f"tasks {cur['tasks']}->{alt['tasks']}, "
          f"combined {cur['combined_blocks']}->{alt['combined_blocks']}")

    step("DONE")
    print("   Also available: MONTHLY plan, what-if goods train, risk-factor "
          "\"why\" for every task, and the interactive web dashboard.")


if __name__ == "__main__":
    main()
