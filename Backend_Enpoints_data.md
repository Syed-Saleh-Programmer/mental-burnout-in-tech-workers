import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ------------------------------------------------------------------------------
# Application Initialization
# ------------------------------------------------------------------------------
app = FastAPI(
    title="Employee Turnover Risk Diagnostic API",
    description="Inference server using calibrated Random Forest / HistGB with optimal thresholding.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------------
# Load Pipeline Artifact
# ------------------------------------------------------------------------------
try:
    artifact = joblib.load("turnover_pipeline.pkl")
    model_pipeline = artifact["pipeline"]
    optimal_threshold = artifact["optimal_threshold"]
    model_name = artifact["model_name"]
    expected_columns = artifact["expected_columns"]
except Exception as e:
    raise RuntimeError(f"Failed to load turnover_pipeline.pkl: {e}")

# ------------------------------------------------------------------------------
# Request / Response Schemas
# ------------------------------------------------------------------------------
class EmployeeInput(BaseModel):
    job_role: str = Field(..., example="Software Engineer")
    country: str = Field(..., example="United States")
    work_environment: str = Field(..., example="Remote")
    work_hours_per_week: float = Field(..., ge=10.0, le=100.0, example=48.0)
    sleep_hours_per_night: float = Field(..., ge=2.0, le=14.0, example=5.0)
    meetings_per_day: int = Field(..., ge=0, le=20, example=6)
    stress_score: int = Field(..., ge=1, le=10, example=8)
    job_burnout_score: int = Field(..., ge=1, le=10, example=8)
    depression_score: int = Field(..., ge=0, le=27, example=14, description="PHQ-9 Depression Scale (0-27)")
    anxiety_score: int = Field(..., ge=0, le=21, example=12, description="GAD-7 Anxiety Scale (0-21)")
    job_satisfaction_score: int = Field(..., ge=1, le=10, example=3)
    salary_usd: float = Field(..., ge=15000.0, le=500000.0, example=115000.0)

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

# ------------------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------------------
@app.get("/health", response_model=HealthCheck)
def health():
    return HealthCheck(
        status="healthy",
        active_model=model_name,
        threshold=round(optimal_threshold, 3),
        expected_features=expected_columns
    )

@app.post("/predict", response_model=PredictionResponse)
def predict(employee: EmployeeInput):
    try:
        data = employee.model_dump()

        # Compute engineered clinical indicators
        wh_sleep_ratio = data["work_hours_per_week"] / (data["sleep_hours_per_night"] * 7 + 1e-5)
        total_mental = (
            data["stress_score"]
            + data["job_burnout_score"]
            + data["depression_score"]
            + data["anxiety_score"]
        )

        data["work_hours_to_sleep_ratio"] = wh_sleep_ratio
        data["total_mental_load"] = total_mental

        # Format input dataframe with expected feature columns
        # The internal ColumnTransformer handles the string-to-numeric encoding automatically
        input_df = pd.DataFrame([data])[expected_columns]

        # 1. Calibrated Probability Prediction
        prob = float(model_pipeline.predict_proba(input_df)[0][1])
        prediction = bool(prob >= optimal_threshold)

        # 2. Risk Tier Categorization
        if prob >= 0.70:
            tier = "Severe Flight Risk"
        elif prob >= optimal_threshold:
            tier = "Elevated Flight Risk"
        elif prob >= 0.15:
            tier = "Moderate / Stable"
        else:
            tier = "High Retention Likelihood"

        # 3. Rule-Based Attribution of Clinical Risk Drivers
        drivers = []
        if total_mental >= 25:
            drivers.append(RiskDriver(
                indicator="Total Mental Load",
                observed_value=round(total_mental, 1),
                benchmark_status="Elevated psychological distress (Clinical Threshold: 25.0)"
            ))
        if wh_sleep_ratio >= 1.15:
            drivers.append(RiskDriver(
                indicator="Work-Hours-to-Sleep Ratio",
                observed_value=round(wh_sleep_ratio, 2),
                benchmark_status="Severe recovery deficit (Deficit Threshold: 1.15)"
            ))
        if data["meetings_per_day"] >= 5:
            drivers.append(RiskDriver(
                indicator="Meetings Per Day",
                observed_value=data["meetings_per_day"],
                benchmark_status="High calendar fragmentation (Focus Threshold: <= 4)"
            ))
        if data["job_satisfaction_score"] <= 3:
            drivers.append(RiskDriver(
                indicator="Job Satisfaction",
                observed_value=data["job_satisfaction_score"],
                benchmark_status="Critically low occupational satisfaction (Threshold: <= 3)"
            ))

        # 4. Prescriptive Retention Action
        if total_mental >= 28 and data["meetings_per_day"] >= 5:
            intervention = "Enforce weekly focus days, cap daily meetings at 2, and provide direct mental health support."
        elif wh_sleep_ratio >= 1.2:
            intervention = "Rebalance sprint workload and restrict after-hours notifications to restore sleep equilibrium."
        elif data["job_satisfaction_score"] <= 3:
            intervention = "Initiate immediate 1-on-1 check-in to discuss role autonomy, career trajectory, and compensation."
        else:
            intervention = "Workload metrics within normal parameters. Maintain routine quarterly check-ins."

        return PredictionResponse(
            turnover_predicted=prediction,
            risk_tier=tier,
            calibrated_probability=round(prob, 4),
            decision_threshold_applied=round(optimal_threshold, 3),
            model_used=model_name,
            work_hours_to_sleep_ratio=round(wh_sleep_ratio, 3),
            total_mental_load=round(total_mental, 1),
            primary_risk_drivers=drivers,
            recommended_retention_action=intervention,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))