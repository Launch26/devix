"""
train_congestion_model.py - Train a single GradientBoostingRegressor for congestion prediction.

The model uses one-hot encoded link_id + polynomial load features so it has
knowledge of each individual link while learning shared congestion patterns.

Features:  load_ratio, load_ratio², load_ratio³, one-hot(link_id)
Target:    observed_latency_ms
Split:     Chronological (tick < 400 = train, tick >= 400 = test)
"""

import os
import json
import math
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import OneHotEncoder
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'Datasets'))
MODELS_DIR = os.path.join(BASE_DIR, '..', 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

TRAFFIC_CSV = os.path.join(DATA_DIR, 'link_traffic_history.csv')
SPLIT_TICK = 400  # Chronological split point


def _build_features(df, encoder, fit=False):
    """
    Build the feature matrix from a dataframe.
    
    Features:
      - load_ratio          (continuous)
      - load_ratio²         (polynomial)
      - load_ratio³         (polynomial)
      - one-hot(link_id)    (12 binary columns, one per link)
    
    Args:
        df: DataFrame with 'load_ratio' and 'link_id' columns.
        encoder: OneHotEncoder instance.
        fit: If True, fit the encoder on this data. If False, transform only.
    
    Returns:
        (X, encoder) — numpy feature matrix and the (possibly fitted) encoder.
    """
    # Polynomial load features
    poly = np.column_stack([
        df['load_ratio'].values,
        df['load_ratio'].values ** 2,
        df['load_ratio'].values ** 3,
    ])
    
    # One-hot encode link_id
    link_ids = df[['link_id']].values
    if fit:
        link_ohe = encoder.fit_transform(link_ids)
    else:
        link_ohe = encoder.transform(link_ids)
    
    X = np.hstack([poly, link_ohe])
    return X, encoder


def train_congestion_model():
    print("\n=== Training Congestion Model (GBR + One-Hot Link ID) ===")
    
    # ── 1. Load and clean data ──────────────────────────────────────────
    df = pd.read_csv(TRAFFIC_CSV)
    df_ok = df[df['status'] == 'ok'].dropna(subset=['observed_latency_ms', 'load_ratio']).copy()
    
    # ── 2. Chronological train/test split ───────────────────────────────
    df_train = df_ok[df_ok['tick'] < SPLIT_TICK].copy()
    df_test  = df_ok[df_ok['tick'] >= SPLIT_TICK].copy()
    
    print(f"  Chronological split at tick {SPLIT_TICK}:")
    print(f"    Train: {len(df_train)} samples (ticks 0–{SPLIT_TICK - 1})")
    print(f"    Test:  {len(df_test)} samples (ticks {SPLIT_TICK}–{df_ok['tick'].max()})")
    
    # ── 3. Build feature matrices ───────────────────────────────────────
    encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
    X_train, encoder = _build_features(df_train, encoder, fit=True)
    X_test, _        = _build_features(df_test,  encoder, fit=False)
    
    y_train = df_train['observed_latency_ms'].values
    y_test  = df_test['observed_latency_ms'].values
    
    # Log the feature names for interpretability
    link_names = encoder.get_feature_names_out(['link_id']).tolist()
    feature_names = ['load_ratio', 'load_ratio_sq', 'load_ratio_cb'] + link_names
    print(f"  Features ({len(feature_names)}): {feature_names[:5]}...{feature_names[-2:]}")
    
    # ── 4. Train GradientBoostingRegressor ──────────────────────────────
    model = GradientBoostingRegressor(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.1,
        subsample=0.8,
        random_state=42,
    )
    model.fit(X_train, y_train)
    
    # ── 5. Evaluate ─────────────────────────────────────────────────────
    y_train_pred = model.predict(X_train)
    y_test_pred  = model.predict(X_test)
    
    train_rmse = math.sqrt(mean_squared_error(y_train, y_train_pred))
    test_rmse  = math.sqrt(mean_squared_error(y_test,  y_test_pred))
    train_r2   = r2_score(y_train, y_train_pred)
    test_r2    = r2_score(y_test,  y_test_pred)
    
    print(f"  [TRAIN] RMSE={train_rmse:,.1f}ms  R²={train_r2:.4f}")
    print(f"  [TEST ] RMSE={test_rmse:,.1f}ms   R²={test_r2:.4f}")
    
    # ── 6. Compute per-link metadata ────────────────────────────────────
    # Baseline latency: predict at load_ratio=0 for each link using the GBR
    # Saturation threshold: minimum load_ratio where status='saturated'
    all_links = sorted(df['link_id'].unique())
    link_meta = {}
    
    for link_id in all_links:
        # Baseline: predict latency at zero load for this specific link
        baseline_df = pd.DataFrame({'link_id': [link_id], 'load_ratio': [0.0]})
        X_baseline, _ = _build_features(baseline_df, encoder, fit=False)
        baseline_latency = float(model.predict(X_baseline)[0])
        
        # Saturation threshold from historical data
        saturated = df[(df['link_id'] == link_id) & (df['status'] == 'saturated')]
        if len(saturated) > 0:
            sat_threshold = float(saturated['load_ratio'].min())
        else:
            sat_threshold = 0.90
        
        link_meta[link_id] = {
            'baseline_latency': round(baseline_latency, 2),
            'saturation_threshold': round(sat_threshold, 4),
            'sample_count': int(len(df_ok[df_ok['link_id'] == link_id])),
        }
    
    # ── 7. Save all artifacts ───────────────────────────────────────────
    # 7a. The trained model
    joblib.dump(model, os.path.join(MODELS_DIR, 'congestion_regressor.joblib'))
    
    # 7b. The fitted encoder (needed at inference to one-hot encode link_id)
    joblib.dump(encoder, os.path.join(MODELS_DIR, 'congestion_encoder.joblib'))
    
    # 7c. Metadata (saturation thresholds + baseline latencies, NO poly_coeffs)
    params = {
        'model_type': 'GradientBoostingRegressor',
        'features': feature_names,
        'split_tick': SPLIT_TICK,
        'per_link': link_meta,
    }
    params_path = os.path.join(MODELS_DIR, 'congestion_params.json')
    with open(params_path, 'w') as f:
        json.dump(params, f, indent=2)
    
    print(f"\n  Saved: congestion_regressor.joblib, congestion_encoder.joblib, congestion_params.json")
    print(f"  Trained on {len(df_ok)} total samples across {len(all_links)} links")


if __name__ == '__main__':
    train_congestion_model()
