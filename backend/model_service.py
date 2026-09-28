from __future__ import annotations

import os
import sys
import sklearn.compose._column_transformer as column_transformer_module
import sklearn._loss as sklearn_loss_module
import sklearn._loss.loss as sklearn_loss_detail_module
from pathlib import Path
from typing import Any

import joblib
import pandas as pd


REQUIRED_ARTIFACT_KEYS = {"pipeline", "optimal_threshold", "model_name", "expected_columns"}
MODEL_DEFAULTS: dict[str, object] = {
    "gender": "Unknown",
    "seniority_level": "Unknown",
    "company_size": "Unknown",
    "industry": "Unknown",
    "phq9_category": "Unknown",
    "gad7_category": "Unknown",
    "burnout_level": "Unknown",
    "employee_id": 0,
    "age": 35,
    "years_experience": 5,
    "years_at_company": 2,
    "team_size": 6,
    "exercise_days_per_week": 2,
    "vacation_days_taken": 10,
    "therapy_access": 0,
    "uses_therapy": 0,
    "ai_tools_daily": 0,
    "manager_support_score": 5,
    "work_life_balance_score": 5,
    "social_support_score": 5,
    "deadline_pressure_score": 5,
    "autonomy_score": 5,
    "seeks_mental_health_support": 0,
}


class _LegacyRemainderColsList(list):
    pass


class ModelArtifactError(RuntimeError):
    """Raised when the configured model artifact cannot serve predictions."""


class TurnoverModel:
    def __init__(self, artifact_path: str | Path | None = None) -> None:
        default_path = Path(__file__).resolve().parent.parent / "turnover_pipeline.pkl"
        self.artifact_path = Path(artifact_path or os.getenv("MODEL_PATH", default_path))
        self.pipeline: Any
        self.optimal_threshold: float
        self.model_name: str
        self.expected_columns: list[str]
        self._load()

    def _load(self) -> None:
        if not self.artifact_path.exists():
            raise ModelArtifactError(f"Model artifact not found: {self.artifact_path}")

        try:
            # scikit-learn 1.6 serialized this list-like helper, which was removed
            # in 1.9. Alias it only for legacy artifact deserialization.
            if not hasattr(column_transformer_module, "_RemainderColsList"):
                column_transformer_module._RemainderColsList = _LegacyRemainderColsList
            if not hasattr(sklearn_loss_module, "CyHalfBinomialLoss"):
                sklearn_loss_module.CyHalfBinomialLoss = sklearn_loss_detail_module.CyHalfBinomialLoss
            sys.modules.setdefault("_loss", sklearn_loss_module)
            artifact = joblib.load(self.artifact_path)
        except Exception as exc:
            raise ModelArtifactError(f"Unable to load model artifact: {exc}") from exc

        if not isinstance(artifact, dict):
            raise ModelArtifactError("Model artifact must be a dictionary.")
        missing_keys = REQUIRED_ARTIFACT_KEYS - artifact.keys()
        if missing_keys:
            raise ModelArtifactError(
                f"Model artifact is missing required keys: {sorted(missing_keys)}"
            )

        expected_columns = artifact["expected_columns"]
        if not isinstance(expected_columns, list) or not all(
            isinstance(column, str) for column in expected_columns
        ):
            raise ModelArtifactError("expected_columns must be a list of strings.")
        if not hasattr(artifact["pipeline"], "predict_proba"):
            raise ModelArtifactError("The configured pipeline must expose predict_proba().")

        try:
            self.optimal_threshold = float(artifact["optimal_threshold"])
        except (TypeError, ValueError) as exc:
            raise ModelArtifactError("optimal_threshold must be numeric.") from exc

        self.pipeline = artifact["pipeline"]
        self.model_name = str(artifact["model_name"])
        self.expected_columns = expected_columns

    def health(self) -> dict[str, object]:
        return {
            "status": "healthy",
            "active_model": self.model_name,
            "threshold": round(self.optimal_threshold, 3),
            "expected_features": self.expected_columns,
        }

    @staticmethod
    def _model_features(data: dict[str, object], work_hours_to_sleep_ratio: float, total_mental_load: int) -> dict[str, object]:
        return {
            **MODEL_DEFAULTS,
            **data,
            "work_mode": data["work_environment"],
            "burnout_score": data["job_burnout_score"],
            "phq9_score": data["depression_score"],
            "gad7_score": data["anxiety_score"],
            "work_hours_to_sleep_ratio": work_hours_to_sleep_ratio,
            "total_mental_load": total_mental_load,
        }

    def predict(self, data: dict[str, object]) -> dict[str, object]:
        work_hours = float(data["work_hours_per_week"])
        sleep_hours = float(data["sleep_hours_per_night"])
        work_hours_to_sleep_ratio = work_hours / (sleep_hours * 7 + 1e-5)
        total_mental_load = (
            int(data["stress_score"])
            + int(data["job_burnout_score"])
            + int(data["depression_score"])
            + int(data["anxiety_score"])
        )

        model_data = self._model_features(data, work_hours_to_sleep_ratio, total_mental_load)
        try:
            input_df = pd.DataFrame([model_data])[self.expected_columns]
            probability = float(self.pipeline.predict_proba(input_df)[0][1])
        except Exception as exc:
            raise ModelArtifactError(f"Model inference failed: {exc}") from exc

        predicted = probability >= self.optimal_threshold
        if probability >= 0.70:
            risk_tier = "Severe Flight Risk"
        elif probability >= self.optimal_threshold:
            risk_tier = "Elevated Flight Risk"
        elif probability >= 0.15:
            risk_tier = "Moderate / Stable"
        else:
            risk_tier = "High Retention Likelihood"

        drivers: list[dict[str, object]] = []
        if total_mental_load >= 25:
            drivers.append(
                {
                    "indicator": "Total Mental Load",
                    "observed_value": round(total_mental_load, 1),
                    "benchmark_status": "Elevated psychological distress (Clinical Threshold: 25.0)",
                }
            )
        if work_hours_to_sleep_ratio >= 1.15:
            drivers.append(
                {
                    "indicator": "Work-Hours-to-Sleep Ratio",
                    "observed_value": round(work_hours_to_sleep_ratio, 2),
                    "benchmark_status": "Severe recovery deficit (Deficit Threshold: 1.15)",
                }
            )
        if int(data["meetings_per_day"]) >= 5:
            drivers.append(
                {
                    "indicator": "Meetings Per Day",
                    "observed_value": int(data["meetings_per_day"]),
                    "benchmark_status": "High calendar fragmentation (Focus Threshold: <= 4)",
                }
            )
        if int(data["job_satisfaction_score"]) <= 3:
            drivers.append(
                {
                    "indicator": "Job Satisfaction",
                    "observed_value": int(data["job_satisfaction_score"]),
                    "benchmark_status": "Critically low occupational satisfaction (Threshold: <= 3)",
                }
            )

        if total_mental_load >= 28 and int(data["meetings_per_day"]) >= 5:
            intervention = (
                "Enforce weekly focus days, cap daily meetings at 2, and provide direct mental health support."
            )
        elif work_hours_to_sleep_ratio >= 1.2:
            intervention = (
                "Rebalance sprint workload and restrict after-hours notifications to restore sleep equilibrium."
            )
        elif int(data["job_satisfaction_score"]) <= 3:
            intervention = (
                "Initiate immediate 1-on-1 check-in to discuss role autonomy, career trajectory, and compensation."
            )
        else:
            intervention = "Workload metrics within normal parameters. Maintain routine quarterly check-ins."

        return {
            "turnover_predicted": predicted,
            "risk_tier": risk_tier,
            "calibrated_probability": round(probability, 4),
            "decision_threshold_applied": round(self.optimal_threshold, 3),
            "model_used": self.model_name,
            "work_hours_to_sleep_ratio": round(work_hours_to_sleep_ratio, 3),
            "total_mental_load": round(total_mental_load, 1),
            "primary_risk_drivers": drivers,
            "recommended_retention_action": intervention,
        }
