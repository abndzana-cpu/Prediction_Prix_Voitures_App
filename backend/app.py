"""
API Flask — Service de prédiction du prix des voitures.

Endpoints :
  GET  /api/options        -> métadonnées (listes déroulantes, plages, infos modèle)
  POST /api/predict        -> prédiction du prix à partir des caractéristiques
  POST /api/feedback       -> notation (1-5) d'une prédiction
  GET  /api/history        -> historique des prédictions de l'utilisateur
  DELETE /api/history       -> vider l'historique
  GET  /api/stats          -> statistiques globales d'usage
  POST /api/upload-image   -> upload d'une photo (jointe à la prédiction)
"""
import json
import mimetypes
import os
import sqlite3
import time
import uuid
from datetime import datetime

import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
DB_PATH = os.path.join(BASE_DIR, "app.db")

os.makedirs(UPLOAD_DIR, exist_ok=True)

# .jfif n'est pas toujours reconnu par le module mimetypes standard de Python.
# On le déclare explicitement comme JPEG pour que send_from_directory renvoie
# le bon Content-Type lorsque ces fichiers sont resservis au client.
mimetypes.add_type("image/jpeg", ".jfif")

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------------------------------
# Chargement des artefacts du modèle
# ---------------------------------------------------------------------------
model = joblib.load(os.path.join(BASE_DIR, "model.joblib"))
scaler = joblib.load(os.path.join(BASE_DIR, "scaler.joblib"))
with open(os.path.join(BASE_DIR, "metadata.json"), encoding="utf-8") as f:
    META = json.load(f)

FEATURE_COLUMNS = META["feature_columns"]
OHE_COLS = META["ohe_cols"]
MAKE_PRICE_MAP = META["make_price_map"]
GLOBAL_MEDIAN_PRICE = META["global_median_price"]
CURRENT_YEAR = META["current_year"]

# Extensions et types MIME d'images acceptés à l'upload.
ALLOWED_IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".jfif", ".webp")
ALLOWED_IMAGE_MIMETYPES = {
    "image/png",
    "image/jpeg",  # couvre .jpg, .jpeg et .jfif (JFIF est un format d'encapsulation JPEG)
    "image/webp",
}


# ---------------------------------------------------------------------------
# Base de données (historique + feedback)
# ---------------------------------------------------------------------------
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS predictions (
            id TEXT PRIMARY KEY,
            created_at TEXT,
            make TEXT,
            model_name TEXT,
            year INTEGER,
            input_json TEXT,
            predicted_price REAL,
            image_path TEXT,
            rating INTEGER
        )
        """
    )
    conn.commit()
    conn.close()


init_db()


# ---------------------------------------------------------------------------
# Construction du vecteur de features à partir des inputs bruts
# ---------------------------------------------------------------------------
def build_feature_row(payload):
    make = payload["make"]
    year = int(payload["year"])
    engine_hp = float(payload["engine_hp"])
    engine_cylinders = float(payload["engine_cylinders"])
    number_of_doors = float(payload["number_of_doors"])
    highway_mpg = float(payload["highway_mpg"])
    city_mpg = float(payload["city_mpg"])
    popularity = float(payload.get("popularity", META["numeric_ranges"]["Popularity"]["median"]))
    engine_fuel_type = payload["engine_fuel_type"]
    transmission_type = payload["transmission_type"]
    driven_wheels = payload["driven_wheels"]
    vehicle_size = payload["vehicle_size"]
    vehicle_style = payload["vehicle_style"]
    is_luxury = int(payload.get("is_luxury", False))
    is_performance = int(payload.get("is_performance", False))

    car_age = CURRENT_YEAR - year
    hp_per_cylinder = engine_hp / engine_cylinders if engine_cylinders else engine_hp
    avg_mpg = (highway_mpg + city_mpg) / 2
    make_encoded = MAKE_PRICE_MAP.get(make, GLOBAL_MEDIAN_PRICE)

    row = {col: 0 for col in FEATURE_COLUMNS}
    row["Engine HP"] = engine_hp
    row["Engine Cylinders"] = engine_cylinders
    row["Number of Doors"] = number_of_doors
    row["highway MPG"] = highway_mpg
    row["city mpg"] = city_mpg
    row["Popularity"] = popularity
    row["Car Age"] = car_age
    row["HP_per_Cylinder"] = hp_per_cylinder
    row["avg_mpg"] = avg_mpg
    row["is_luxury"] = is_luxury
    row["is_performance"] = is_performance
    row["Make_encoded"] = make_encoded

    for col, val in [
        ("Engine Fuel Type", engine_fuel_type),
        ("Transmission Type", transmission_type),
        ("Driven_Wheels", driven_wheels),
        ("Vehicle Size", vehicle_size),
        ("Vehicle Style", vehicle_style),
    ]:
        dummy_col = f"{col}_{val}"
        if dummy_col in row:
            row[dummy_col] = 1
        # si la modalité correspond à la catégorie de référence (drop_first),
        # toutes les dummies de cette variable restent à 0 -> comportement correct.

    ordered = [row[c] for c in FEATURE_COLUMNS]
    return np.array(ordered).reshape(1, -1)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.route("/api/options", methods=["GET"])
def options():
    return jsonify(
        {
            "make_options": META["make_options"],
            "categorical_options": META["categorical_options"],
            "numeric_ranges": META["numeric_ranges"],
            "year_range": META["year_range"],
            "best_model_name": META["best_model_name"],
            "metrics": META["metrics"],
            "feature_importance": META["feature_importance"],
            "all_models_comparison": META["all_models_comparison"],
        }
    )


@app.route("/api/predict", methods=["POST"])
def predict():
    payload = request.get_json(force=True)
    required = [
        "make", "year", "engine_hp", "engine_cylinders", "number_of_doors",
        "highway_mpg", "city_mpg", "engine_fuel_type", "transmission_type",
        "driven_wheels", "vehicle_size", "vehicle_style",
    ]
    missing = [f for f in required if f not in payload or payload[f] in (None, "")]
    if missing:
        return jsonify({"error": f"Champs manquants : {', '.join(missing)}"}), 400

    try:
        X_row = build_feature_row(payload)
        X_scaled = scaler.transform(pd.DataFrame(X_row, columns=FEATURE_COLUMNS))
        pred_log = model.predict(X_scaled)[0]
        predicted_price = float(np.expm1(pred_log))
        predicted_price = max(predicted_price, 0)
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": f"Erreur de prédiction : {exc}"}), 500

    pred_id = str(uuid.uuid4())
    conn = get_db()
    conn.execute(
        "INSERT INTO predictions (id, created_at, make, model_name, year, input_json, predicted_price, image_path, rating) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            pred_id,
            datetime.utcnow().isoformat(),
            payload["make"],
            payload.get("model_label", ""),
            int(payload["year"]),
            json.dumps(payload),
            predicted_price,
            payload.get("image_path"),
            None,
        ),
    )
    conn.commit()
    conn.close()

    return jsonify(
        {
            "id": pred_id,
            "predicted_price": round(predicted_price, 2),
            "model_used": META["best_model_name"],
            "confidence_r2": META["metrics"]["R2"],
        }
    )


@app.route("/api/feedback", methods=["POST"])
def feedback():
    payload = request.get_json(force=True)
    pred_id = payload.get("id")
    rating = payload.get("rating")
    if not pred_id or rating is None:
        return jsonify({"error": "id et rating requis"}), 400
    if not (1 <= int(rating) <= 5):
        return jsonify({"error": "rating doit être entre 1 et 5"}), 400

    conn = get_db()
    conn.execute("UPDATE predictions SET rating = ? WHERE id = ?", (int(rating), pred_id))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/history", methods=["GET"])
def history():
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM predictions ORDER BY created_at DESC LIMIT 200"
    ).fetchall()
    conn.close()
    result = []
    for r in rows:
        result.append(
            {
                "id": r["id"],
                "created_at": r["created_at"],
                "make": r["make"],
                "model_name": r["model_name"],
                "year": r["year"],
                "input": json.loads(r["input_json"]),
                "predicted_price": r["predicted_price"],
                "image_path": r["image_path"],
                "rating": r["rating"],
            }
        )
    return jsonify(result)


@app.route("/api/history", methods=["DELETE"])
def clear_history():
    conn = get_db()
    conn.execute("DELETE FROM predictions")
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/stats", methods=["GET"])
def stats():
    conn = get_db()
    rows = conn.execute("SELECT * FROM predictions").fetchall()
    conn.close()

    total = len(rows)
    if total == 0:
        return jsonify(
            {
                "total_predictions": 0,
                "average_price": 0,
                "average_rating": None,
                "rating_count": 0,
                "price_by_make": [],
                "predictions_over_time": [],
                "rating_distribution": {str(i): 0 for i in range(1, 6)},
            }
        )

    prices = [r["predicted_price"] for r in rows]
    ratings = [r["rating"] for r in rows if r["rating"] is not None]

    by_make = {}
    for r in rows:
        by_make.setdefault(r["make"], []).append(r["predicted_price"])
    price_by_make = [
        {"make": make, "average_price": round(sum(v) / len(v), 2), "count": len(v)}
        for make, v in sorted(by_make.items(), key=lambda x: -len(x[1]))[:10]
    ]

    by_day = {}
    for r in rows:
        day = r["created_at"][:10]
        by_day[day] = by_day.get(day, 0) + 1
    predictions_over_time = [
        {"date": d, "count": c} for d, c in sorted(by_day.items())
    ]

    rating_distribution = {str(i): 0 for i in range(1, 6)}
    for r in ratings:
        rating_distribution[str(int(r))] += 1

    return jsonify(
        {
            "total_predictions": total,
            "average_price": round(sum(prices) / len(prices), 2),
            "average_rating": round(sum(ratings) / len(ratings), 2) if ratings else None,
            "rating_count": len(ratings),
            "price_by_make": price_by_make,
            "predictions_over_time": predictions_over_time,
            "rating_distribution": rating_distribution,
        }
    )


@app.route("/api/upload-image", methods=["POST"])
def upload_image():
    if "image" not in request.files:
        return jsonify({"error": "Aucune image fournie"}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "Nom de fichier vide"}), 400

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        return jsonify(
            {
                "error": "Format non supporté. Formats acceptés : "
                + ", ".join(ALLOWED_IMAGE_EXTENSIONS)
            }
        ), 400

    # Vérification complémentaire du type MIME envoyé par le navigateur.
    # Les fichiers .jfif sont en général envoyés avec le mimetype image/jpeg.
    if file.mimetype and file.mimetype not in ALLOWED_IMAGE_MIMETYPES:
        return jsonify({"error": f"Type MIME non supporté : {file.mimetype}"}), 400

    filename = f"{uuid.uuid4().hex}{ext}"
    file.save(os.path.join(UPLOAD_DIR, filename))
    return jsonify({"image_path": f"/api/uploads/{filename}"})


@app.route("/api/uploads/<path:filename>", methods=["GET"])
def serve_upload(filename):
    return send_from_directory(UPLOAD_DIR, filename)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": META["best_model_name"], "time": time.time()})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
