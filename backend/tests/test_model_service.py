from backend.model_service import TurnoverModel


class StubPipeline:
    def __init__(self, probability: float):
        self.probability = probability

    def predict_proba(self, _data):
        return [[1 - self.probability, self.probability]]


def make_model(probability: float) -> TurnoverModel:
    model = TurnoverModel.__new__(TurnoverModel)
    model.pipeline = StubPipeline(probability)
    model.optimal_threshold = 0.42
    model.model_name = "test-model"
    model.expected_columns = [
        "job_role", "country", "work_environment", "work_hours_per_week",
        "sleep_hours_per_night", "meetings_per_day", "stress_score",
        "job_burnout_score", "depression_score", "anxiety_score",
        "job_satisfaction_score", "salary_usd", "work_hours_to_sleep_ratio",
        "total_mental_load",
    ]
    return model


def base_input():
    return {
        "job_role": "Engineer", "country": "United States", "work_environment": "Remote",
        "work_hours_per_week": 48, "sleep_hours_per_night": 5, "meetings_per_day": 6,
        "stress_score": 8, "job_burnout_score": 8, "depression_score": 14,
        "anxiety_score": 12, "job_satisfaction_score": 3, "salary_usd": 115000,
    }


def test_predict_computes_metrics_and_drivers():
    result = make_model(0.76).predict(base_input())

    assert result["risk_tier"] == "Severe Flight Risk"
    assert result["turnover_predicted"] is True
    assert result["work_hours_to_sleep_ratio"] == 1.371
    assert result["total_mental_load"] == 42
    assert {driver["indicator"] for driver in result["primary_risk_drivers"]} == {
        "Total Mental Load", "Work-Hours-to-Sleep Ratio", "Meetings Per Day", "Job Satisfaction"
    }


def test_predict_returns_stable_tier_without_drivers():
    data = base_input() | {
        "work_hours_per_week": 40, "sleep_hours_per_night": 8,
        "meetings_per_day": 2, "stress_score": 2, "job_burnout_score": 2,
        "depression_score": 1, "anxiety_score": 1, "job_satisfaction_score": 8,
    }
    result = make_model(0.10).predict(data)

    assert result["risk_tier"] == "High Retention Likelihood"
    assert result["turnover_predicted"] is False
    assert result["primary_risk_drivers"] == []
