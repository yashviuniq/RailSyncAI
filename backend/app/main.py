"""FastAPI application for the Railway Maintenance Orchestrator."""
from __future__ import annotations

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.engine.orchestrator import Orchestrator

load_dotenv()

app = FastAPI(
    title="Railway Maintenance Orchestrator",
    description="AI-powered automatic block planning to maximize asset availability "
                "for train operations on Indian Railways.",
    version="1.0.0",
)

# Read allowed origins from env. Defaults to "*" (open) for convenience.
_cors_origins = os.getenv("CORS_ORIGINS", "*")
cors_origins = (
    [o.strip() for o in _cors_origins.split(",") if o.strip()]
    if _cors_origins != "*"
    else ["*"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# A single in-memory orchestrator shared by all routes (demo state)
app.state.orchestrator = Orchestrator(seed=42, n_tasks=45)

app.include_router(router)


@app.get("/")
def root():
    return {
        "app": "Railway Maintenance Orchestrator",
        "docs": "/docs",
        "snapshot": "/api/snapshot",
    }
