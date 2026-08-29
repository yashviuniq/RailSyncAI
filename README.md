# RailSync AI — Railway Maintenance Orchestrator (SIH26)

AI-powered automatic block planning that maximizes asset availability for train
operations on Indian Railways. RailSync AI finds every low-traffic railway window
(a **maintenance opportunity**), bundles compatible work from TMS/SMMS/TDMS
across departments into one coordinated block, and optimizes with OR-Tools CP-SAT —
while keeping every recommendation explainable ("Why?").

All data is synthetic/prototype, since live TMS/SMMS/TDMS/COA systems are protected.
Adapters make it pluggable to real system data.

## Quick start

**Backend (FastAPI + OR-Tools):**
```bash
cd backend
pip install -r requirements.txt
python run.py            # http://127.0.0.1:8000  (API docs at /docs)
```

**Frontend (React + TS + Tailwind):**
```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

Open **http://localhost:5173**.

**CLI demo (no browser):**
```bash
cd backend
python scripts/demo.py
```

## Repo layout

```
backend/
  app/api/        FastAPI routes (snapshot, tasks, opportunities, weekly,
                  monthly, before-after, what-if)
  app/engine/     risk, traffic, opportunity, optimizer (CP-SAT), monthly,
                  what-if, orchestrator
  app/core/       pydantic models + network topology
  app/data/       synthetic dataset generator + CSV export
  data/generated/ synthetic TMS/SMMS/TDMS/COA/BDMS exports (regenerated)
frontend/
  src/            React + TypeScript + Tailwind dashboard