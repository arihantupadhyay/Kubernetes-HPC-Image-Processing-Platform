
import json
import urllib.request
from pathlib import Path

import pandas as pd
import joblib

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline


API_URL = "http://localhost:5001/api/analytics"

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model.joblib"
RESULT_PATH = BASE_DIR / "training_results.json"


def fetch_jobs():
    request = urllib.request.Request(
        API_URL,
        headers={"Accept": "application/json"}
    )

    with urllib.request.urlopen(request, timeout=15) as response:
        data = json.loads(response.read().decode("utf-8"))

    return data.get("jobs", [])


def prepare_dataset(jobs):
    records = []

    for job in jobs:
        input_data = job.get("input") or {}
        output_data = job.get("output") or {}

        duration = job.get("processingTimeSeconds")

        if job.get("status") != "completed":
            continue

        if duration is None or not input_data or not output_data:
            continue

        try:
            size_bytes = float(input_data["sizeBytes"])
            width = float(input_data["width"])
            height = float(input_data["height"])
            duration = float(duration)

            operation = str(job["operation"])

            if size_bytes <= 0 or width <= 0 or height <= 0:
                continue

            if duration <= 0:
                continue

            records.append({
                "sizeMB": size_bytes / (1024 * 1024),
                "width": width,
                "height": height,
                "pixels": width * height,
                "operation": operation,
                "processingTimeSeconds": duration
            })

        except (KeyError, TypeError, ValueError):
            continue

    return pd.DataFrame(records)


def train_model():
    print("\nFetching real Kubernetes job data...")

    jobs = fetch_jobs()
    dataset = prepare_dataset(jobs)

    print("Total API jobs:", len(jobs))
    print("Valid ML records:", len(dataset))

    if len(dataset) < 10:
        raise ValueError(
            "At least 10 valid processing records are required."
        )

    print("\nOperation distribution:")
    print(dataset["operation"].value_counts())

    features = [
        "sizeMB",
        "width",
        "height",
        "pixels",
        "operation"
    ]

    X = dataset[features]
    y = dataset["processingTimeSeconds"]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42
    )

    preprocessing = ColumnTransformer(
        transformers=[
            (
                "operation",
                OneHotEncoder(handle_unknown="ignore"),
                ["operation"]
            )
        ],
        remainder="passthrough"
    )

    model = Pipeline(
        steps=[
            ("preprocessing", preprocessing),
            (
                "regressor",
                RandomForestRegressor(
                    n_estimators=200,
                    random_state=42,
                    max_depth=8
                )
            )
        ]
    )

    print("\nTraining Random Forest model...")

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    mae = mean_absolute_error(y_test, predictions)

    r2 = (
        r2_score(y_test, predictions)
        if len(y_test) >= 2
        else None
    )

    joblib.dump(model, MODEL_PATH)

    results = {
        "modelName": "Random Forest Regressor",
        "target": "processingTimeSeconds",
        "totalRecords": len(dataset),
        "trainingRecords": len(X_train),
        "testingRecords": len(X_test),
        "maeSeconds": round(float(mae), 4),
        "r2Score": round(float(r2), 4) if r2 is not None else None,
        "operations": sorted(dataset["operation"].unique().tolist()),
        "trainedAt": pd.Timestamp.now().isoformat(),
        "status": "trained"
    }

    with open(RESULT_PATH, "w") as file:
        json.dump(results, file, indent=4)

    print("\n========== MODEL RESULTS ==========")
    print("Model:", results["modelName"])
    print("Training records:", results["trainingRecords"])
    print("Testing records:", results["testingRecords"])
    print("MAE:", results["maeSeconds"], "seconds")
    print("R2 score:", results["r2Score"])
    print("Model saved:", MODEL_PATH)
    print("Results saved:", RESULT_PATH)
    print("===================================")


if __name__ == "__main__":
    try:
        train_model()
    except Exception as error:
        print("\nTraining failed:", error)
