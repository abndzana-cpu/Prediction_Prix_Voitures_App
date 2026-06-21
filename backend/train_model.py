"""
Entraînement du modèle de prédiction du prix des voitures.
Reproduit le pipeline du notebook Prix.ipynb et exporte les artefacts
nécessaires au service Flask (modèle, scaler, mappings d'encodage).
"""
import json

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import RandomizedSearchCV, train_test_split
from sklearn.preprocessing import StandardScaler

import lightgbm as lgb
import xgboost as xgb

RANDOM_STATE = 42
CURRENT_YEAR = 2024

print("=== Chargement des données ===")
df = pd.read_csv("data.csv")
print(f"Dimensions initiales : {df.shape}")

# ---------------------------------------------------------------------------
# Etape 4 : Nettoyage
# ---------------------------------------------------------------------------
df_clean = df.drop_duplicates().copy()

df_clean["Engine HP"] = df_clean["Engine HP"].fillna(
    df_clean.groupby(["Make", "Model"])["Engine HP"].transform("median")
)
df_clean["Engine HP"] = df_clean["Engine HP"].fillna(df_clean["Engine HP"].median())

df_clean["Engine Cylinders"] = df_clean["Engine Cylinders"].fillna(
    df_clean.groupby("Engine Fuel Type")["Engine Cylinders"].transform("median")
)
df_clean["Engine Cylinders"] = df_clean["Engine Cylinders"].fillna(
    df_clean["Engine Cylinders"].median()
)

df_clean["Number of Doors"] = df_clean["Number of Doors"].fillna(
    df_clean.groupby("Vehicle Style")["Number of Doors"].transform(
        lambda x: x.mode()[0]
    )
)

df_clean["Engine Fuel Type"] = df_clean["Engine Fuel Type"].fillna(
    df_clean["Engine Fuel Type"].mode()[0]
)
df_clean["Market Category"] = df_clean["Market Category"].fillna("Unknown")

df_clean = df_clean[df_clean["MSRP"] <= 500_000]

cap_bounds = {}
for var in ["Engine HP", "city mpg", "highway MPG"]:
    Q1, Q3 = df_clean[var].quantile([0.25, 0.75])
    IQR = Q3 - Q1
    b_inf, b_sup = Q1 - 1.5 * IQR, Q3 + 1.5 * IQR
    df_clean[var] = df_clean[var].clip(b_inf, b_sup)
    cap_bounds[var] = {"min": float(b_inf), "max": float(b_sup)}

# ---------------------------------------------------------------------------
# Etape 5 : Feature engineering
# ---------------------------------------------------------------------------
df_clean["Car Age"] = CURRENT_YEAR - df_clean["Year"]
df_clean["HP_per_Cylinder"] = df_clean["Engine HP"] / df_clean[
    "Engine Cylinders"
].replace(0, np.nan)
df_clean["HP_per_Cylinder"] = df_clean["HP_per_Cylinder"].fillna(
    df_clean["HP_per_Cylinder"].median()
)
df_clean["avg_mpg"] = (df_clean["highway MPG"] + df_clean["city mpg"]) / 2
df_clean["is_luxury"] = (
    df_clean["Market Category"].str.contains("Luxury", case=False, na=False).astype(int)
)
df_clean["is_performance"] = (
    df_clean["Market Category"]
    .str.contains("High-Performance", case=False, na=False)
    .astype(int)
)

# ---------------------------------------------------------------------------
# Etape 6 : Encodage
# ---------------------------------------------------------------------------
drop_cols = ["Model", "Market Category", "Year"]
df_model = df_clean.drop(columns=drop_cols)

make_price_map = df_clean.groupby("Make")["MSRP"].median()
global_median_price = float(df_clean["MSRP"].median())
df_model["Make_encoded"] = df_model["Make"].map(make_price_map)
df_model = df_model.drop(columns=["Make"])

ohe_cols = [
    "Engine Fuel Type",
    "Transmission Type",
    "Driven_Wheels",
    "Vehicle Size",
    "Vehicle Style",
]
# Sauvegarder les modalités possibles AVANT le one-hot (pour le front + l'API)
categorical_options = {col: sorted(df_clean[col].dropna().unique().tolist()) for col in ohe_cols}
make_options = sorted(df_clean["Make"].dropna().unique().tolist())

df_model = pd.get_dummies(df_model, columns=ohe_cols, drop_first=True)
bool_cols = df_model.select_dtypes(include="bool").columns
df_model[bool_cols] = df_model[bool_cols].astype(int)

TARGET = "MSRP"
X = df_model.drop(columns=[TARGET])
y = np.log1p(df_model[TARGET])
FEATURE_COLUMNS = X.columns.tolist()

# ---------------------------------------------------------------------------
# Etape 8-9 : Split + normalisation
# ---------------------------------------------------------------------------
X_train, X_temp, y_train, y_temp = train_test_split(
    X, y, test_size=0.20, random_state=RANDOM_STATE
)
X_val, X_test, y_val, y_test = train_test_split(
    X_temp, y_temp, test_size=0.50, random_state=RANDOM_STATE
)

scaler = StandardScaler()
X_train_sc = scaler.fit_transform(X_train)
X_val_sc = scaler.transform(X_val)
X_test_sc = scaler.transform(X_test)


def evaluate_model(model, X_tr, y_tr, X_v, y_v, name):
    model.fit(X_tr, y_tr)
    y_pred_val_log = model.predict(X_v)
    y_pred_val = np.expm1(y_pred_val_log)
    y_val_orig = np.expm1(y_v)
    mae = mean_absolute_error(y_val_orig, y_pred_val)
    rmse = np.sqrt(mean_squared_error(y_val_orig, y_pred_val))
    r2 = r2_score(y_v, y_pred_val_log)
    print(f"{name:<30} MAE={mae:>10,.0f}  RMSE={rmse:>10,.0f}  R2={r2:.4f}")
    return {"model": model, "name": name, "MAE": mae, "RMSE": rmse, "R2": r2}


print("\n=== Entraînement des modèles ===")
results = []
results.append(evaluate_model(LinearRegression(), X_train_sc, y_train, X_val_sc, y_val, "Régression Linéaire"))
results.append(evaluate_model(Ridge(alpha=10), X_train_sc, y_train, X_val_sc, y_val, "Ridge"))

print("\nRandomizedSearchCV Random Forest (réduit pour rapidité)...")
param_dist_rf = {
    "n_estimators": [150, 250, 350],
    "max_depth": [12, 18, None],
    "min_samples_leaf": [2, 5],
    "min_samples_split": [2, 5],
    "max_features": ["sqrt", 0.5],
}
rf_search = RandomizedSearchCV(
    RandomForestRegressor(random_state=RANDOM_STATE, n_jobs=-1),
    param_distributions=param_dist_rf,
    n_iter=6,
    cv=3,
    scoring="neg_mean_absolute_error",
    random_state=RANDOM_STATE,
    n_jobs=-1,
)
rf_search.fit(X_train_sc, y_train)
rf_best = rf_search.best_estimator_
results.append(evaluate_model(rf_best, X_train_sc, y_train, X_val_sc, y_val, "Random Forest (tuned)"))

results.append(
    evaluate_model(
        GradientBoostingRegressor(n_estimators=100, learning_rate=0.05, max_depth=5, random_state=RANDOM_STATE),
        X_train_sc, y_train, X_val_sc, y_val, "Gradient Boosting",
    )
)
results.append(
    evaluate_model(
        xgb.XGBRegressor(
            n_estimators=200, learning_rate=0.05, max_depth=6, subsample=0.8,
            colsample_bytree=0.8, reg_alpha=0.1, reg_lambda=1.0,
            random_state=RANDOM_STATE, n_jobs=-1, verbosity=0,
        ),
        X_train_sc, y_train, X_val_sc, y_val, "XGBoost",
    )
)
results.append(
    evaluate_model(
        lgb.LGBMRegressor(
            n_estimators=200, learning_rate=0.05, max_depth=6, num_leaves=63,
            subsample=0.8, colsample_bytree=0.8, reg_alpha=0.1, reg_lambda=1.0,
            random_state=RANDOM_STATE, n_jobs=-1, verbose=-1,
        ),
        X_train_sc, y_train, X_val_sc, y_val, "LightGBM",
    )
)

best_result = max(results, key=lambda r: r["R2"])
best_model = best_result["model"]
print(f"\n>>> Meilleur modèle : {best_result['name']} (R²={best_result['R2']:.4f})")

# Evaluation finale test
y_pred_test = np.expm1(best_model.predict(X_test_sc))
y_test_orig = np.expm1(y_test)
mae_test = float(mean_absolute_error(y_test_orig, y_pred_test))
rmse_test = float(np.sqrt(mean_squared_error(y_test_orig, y_pred_test)))
r2_test = float(r2_score(y_test, np.log1p(y_pred_test)))
print(f"TEST -> MAE=${mae_test:,.0f}  RMSE=${rmse_test:,.0f}  R2={r2_test:.4f}")

# Importance des variables (si dispo)
if hasattr(best_model, "feature_importances_"):
    feat_imp = (
        pd.Series(best_model.feature_importances_, index=FEATURE_COLUMNS)
        .sort_values(ascending=False)
        .head(15)
    )
else:
    feat_imp = (
        pd.Series(np.abs(best_model.coef_), index=FEATURE_COLUMNS)
        .sort_values(ascending=False)
        .head(15)
    )
feature_importance = {k: float(v) for k, v in feat_imp.items()}

# ---------------------------------------------------------------------------
# Export des artefacts
# ---------------------------------------------------------------------------
joblib.dump(best_model, "model.joblib")
joblib.dump(scaler, "scaler.joblib")

metadata = {
    "feature_columns": FEATURE_COLUMNS,
    "ohe_cols": ohe_cols,
    "categorical_options": categorical_options,
    "make_options": make_options,
    "make_price_map": {k: float(v) for k, v in make_price_map.items()},
    "global_median_price": global_median_price,
    "cap_bounds": cap_bounds,
    "current_year": CURRENT_YEAR,
    "best_model_name": best_result["name"],
    "metrics": {
        "MAE": mae_test,
        "RMSE": rmse_test,
        "R2": r2_test,
    },
    "all_models_comparison": [
        {"name": r["name"], "MAE": float(r["MAE"]), "RMSE": float(r["RMSE"]), "R2": float(r["R2"])}
        for r in results
    ],
    "feature_importance": feature_importance,
    "numeric_ranges": {
        col: {"min": float(df_clean[col].min()), "max": float(df_clean[col].max()), "median": float(df_clean[col].median())}
        for col in ["Engine HP", "Engine Cylinders", "Number of Doors", "highway MPG", "city mpg", "Popularity"]
    },
    "year_range": {"min": int(df_clean["Year"].min()), "max": int(df_clean["Year"].max())},
}

with open("metadata.json", "w", encoding="utf-8") as f:
    json.dump(metadata, f, ensure_ascii=False, indent=2)

print("\nArtefacts exportés : model.joblib, scaler.joblib, metadata.json")
