# Morrow wellbeing signal MVP

A local FastAPI + React/Vite application that serves the supplied turnover model as a transparent workload and retention conversation aid.

## Run the backend

Python 3.11+ is required for the model service.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
uvicorn backend.main:app --reload
```

The API runs at `http://localhost:8000`. Check `http://localhost:8000/docs` for the OpenAPI page.

The loader expects `turnover_pipeline.pkl` at the repository root by default. Override it with `MODEL_PATH`. The artifact must be a dictionary containing `pipeline`, `optimal_threshold`, `model_name`, and `expected_columns`. The supplied artifact was trained with scikit-learn 1.6.1 and is currently loaded under 1.9.x using a narrowly scoped legacy deserialization compatibility adapter. For production, retrain or re-export the model with the exact runtime dependency versions.

## Run the frontend

```powershell
cd frontend
npm install
npm run dev
```

The Vite app runs at `http://localhost:5173`. Copy `frontend/.env.example` to `frontend/.env` to change the API URL.

## Test

```powershell
pytest backend\tests
cd frontend
npm run lint
npm run build
```

Backend tests use a stub pipeline and do not require the binary model artifact. A local Python installation is required to run them.

## API contract

`GET /health` reports model readiness, model name, threshold, and expected feature columns.

`POST /predict` accepts role, country, work environment, work hours, sleep, meetings, wellbeing scores, job satisfaction, and salary. The backend computes the engineered work-to-sleep ratio and total mental load, maps equivalent fields to the supplied artifact, and applies neutral defaults for training features not collected by the reference form. It then returns the calibrated probability, risk tier, primary drivers, and recommended action.

## Privacy and limitations

Inputs are sent to the local API only for the active prediction request. The frontend does not write submitted values to local storage or URLs. This output is a decision-support signal, not a medical diagnosis and never a sufficient basis for an employment decision. Production use would require authentication, transport/storage controls, access policy, model validation, and employment/privacy review.

## Need to improve models accuracy