"""REST routes exposing the orchestrator results to the frontend."""
from __future__ import annotations

from fastapi import APIRouter, Request, Query

router = APIRouter(prefix="/api", tags=["orchestrator"])


def get_orch(request: Request):
    return request.app.state.orchestrator


@router.get("/snapshot")
def snapshot(request: Request):
    """Full aggregated payload for the frontend dashboard."""
    return get_orch(request).snapshot()


@router.get("/kpis")
def kpis(request: Request):
    return get_orch(request).kpis()


@router.get("/tasks")
def tasks(request: Request, section: str = Query(None)):
    orch = get_orch(request)
    s = orch.snapshot()
    tasks = s["tasks"]
    if section:
        tasks = [t for t in tasks if t["section_id"] == section]
    return tasks


@router.get("/opportunities")
def opportunities(request: Request):
    return get_orch(request).snapshot()["opportunities"]


@router.get("/weekly")
def weekly(request: Request):
    return get_orch(request).snapshot()["weekly_plan"]


@router.get("/monthly")
def monthly(request: Request):
    return get_orch(request).snapshot()["monthly_plan"]


@router.get("/network")
def network(request: Request):
    return get_orch(request).snapshot()["network"]


@router.get("/before-after")
def before_after(request: Request):
    return get_orch(request).before_after()


@router.post("/whatif/critical-defect")
def whatif_critical_defect(request: Request, section_id: str = Query("SEC-B")):
    return get_orch(request).add_critical_defect(section_id)


@router.post("/whatif/goods-train")
def whatif_goods_train(request: Request, section_id: str = Query("SEC-B"),
                       entry_minute: int = Query(140)):
    return get_orch(request).add_goods_train(section_id, entry_minute)
