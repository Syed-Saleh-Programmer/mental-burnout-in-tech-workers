from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

from .model_service import ModelArtifactError, TurnoverModel


class EmployeeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    job_role: str = Field(..., min_length=1, max_length=100, examples=["Software Engineer"])
    country: str = Field(..., min_length=1, max_length=100, examples=["United States"])
    work_environment: str = Field(..., min_length=1, max_length=50, examples=["Remote"])
    work_hours_per_week: float = Field(..., ge=10.0, le=100.0, examples=[48.0])
    sleep_hours_per_night: float = Field(..., ge=2.0, le=14.0, examples=[5.0])
    meetings_per_day: int = Field(..., ge=0, le=20, examples=[6])
    stress_score: int = Field(..., ge=1, le=10, examples=[8])
    job_burnout_score: int = Field(..., ge=1, le=10, examples=[8])
    depression_score: int = Field(..., ge=0, le=27, examples=[14])
    anxiety_score: int = Field(..., ge=0, le=21, examples=[12])
    job_satisfaction_score: int = Field(..., ge=1, le=10, examples=[3])
    salary_usd: float = Field(..., ge=15000.0, le=500000.0, examples=[115000.0])


class RiskDriver(BaseModel):
    indicator: str
    observed_value: float | str
    benchmark_status: str


class PredictionResponse(BaseModel):
    turnover_predicted: bool
    risk_tier: str
    calibrated_probability: float
    decision_threshold_applied: float
    model_used: str
    work_hours_to_sleep_ratio: float
    total_mental_load: float
    primary_risk_drivers: list[RiskDriver]
    recommended_retention_action: str


class HealthCheck(BaseModel):
    status: str
    active_model: str
    threshold: float
    expected_features: list[str]


def allowed_origins() -> list[str]:
    return [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if origin.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        app.state.model = TurnoverModel()
        app.state.model_error = None
    except ModelArtifactError as exc:
        app.state.model = None
        app.state.model_error = str(exc)
    yield


app = FastAPI(
    title="Employee Turnover Risk Diagnostic API",
    description="Inference server for workload and retention risk decision support.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


def get_model(request: Request) -> TurnoverModel:
    model: TurnoverModel | None = getattr(request.app.state, "model", None)
    if model is None:
        detail = getattr(request.app.state, "model_error", "Model is unavailable.")
        raise HTTPException(status_code=503, detail=detail)
    return model


@app.get("/health", response_model=HealthCheck)
def health(request: Request) -> Any:
    return get_model(request).health()


@app.post("/predict", response_model=PredictionResponse)
def predict(employee: EmployeeInput, request: Request) -> Any:
    try:
        return get_model(request).predict(employee.model_dump())
    except ModelArtifactError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
