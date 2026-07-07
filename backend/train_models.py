"""
train_models.py - Offline model training from historical CSV datasets.
Trains 3 models:
  1. Congestion model from link_traffic_history.csv
  2. Trust/deception classifier from link_telemetry.csv
  3. Targeting-risk model from link_incident_history.csv
Saves all trained parameters to models/trained_params.json and sklearn models to models/
"""

import os
import json
import math
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, mean_squared_error
import joblib

# ──────────────────────────────────────────────────────────────
# Paths
# ──────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', '..', 'challenge'))
MODELS_DIR = os.path.join(BASE_DIR, 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

TRAFFIC_CSV = os.path.join(DATA_DIR, 'link_traffic_history.csv')
TELEMETRY_CSV = os.path.join(DATA_DIR, 'link_telemetry.csv')
INCIDENT_CSV = os.path.join(DATA_DIR, 'link_incident_history.csv')


def train_congestion_model():
    """
    Congestion Model: predicts observed_latency_ms from load_ratio.
    Also learns saturation thresholds per link.
    
    The model learns Chimera's non-linear throttling curve:
    how latency scales exponentially as load_ratio increases.
    """
    print("\n═══ Training Congestion Model ═══")
    df = pd.read_csv(TRAFFIC_CSV)
    
    # Drop rows where observed_latency_ms is null (saturated links)
    df_ok = df[df['status'] == 'ok'].copy()
    df_ok = df_ok.dropna(subset=['observed_latency_ms', 'load_ratio'])
    
    # ── Per-link congestion curves ──
    # For each link, fit a polynomial mapping load_ratio -> latency
    link_params = {}
    all_links = df['link_id'].unique()
    
    for link_id in all_links:
        link_data = df_ok[df_ok['link_id'] == link_id]
        if len(link_data) < 10:
            continue
        
        x = link_data['load_ratio'].values
        y = link_data['observed_latency_ms'].values
        
        # Fit polynomial degree 3 to capture non-linear throttling
        try:
            coeffs = np.polyfit(x, y, 3)
            
            # Find base latency (latency at load_ratio ~ 0)
            base_latency = np.polyval(coeffs, 0.0)
            
            # Find saturation threshold from actual data
            saturated = df[(df['link_id'] == link_id) & (df['status'] == 'saturated')]
            if len(saturated) > 0:
                sat_threshold = saturated['load_ratio'].min()
            else:
                sat_threshold = 0.90  # default per challenge docs
            
            link_params[link_id] = {
                'poly_coeffs': coeffs.tolist(),
                'base_latency': float(base_latency),
                'saturation_threshold': float(sat_threshold),
                'sample_count': int(len(link_data))
            }
        except Exception as e:
            print(f"  Warning: could not fit {link_id}: {e}")
    
    # ── Global congestion model using GradientBoosting ──
    # Features: load_ratio, load_ratio^2, load_ratio^3
    X_all = df_ok[['load_ratio']].copy()
    X_all['load_ratio_sq'] = X_all['load_ratio'] ** 2
    X_all['load_ratio_cb'] = X_all['load_ratio'] ** 3
    y_all = df_ok['observed_latency_ms'].values
    
    X_train, X_test, y_train, y_test = train_test_split(
        X_all.values, y_all, test_size=0.2, random_state=42
    )
    
    congestion_reg = GradientBoostingRegressor(
        n_estimators=100, max_depth=4, random_state=42, learning_rate=0.1
    )
    congestion_reg.fit(X_train, y_train)
    
    y_pred = congestion_reg.predict(X_test)
    rmse = math.sqrt(mean_squared_error(y_test, y_pred))
    print(f"  Global congestion model RMSE: {rmse:.2f} ms")
    print(f"  Trained on {len(df_ok)} samples across {len(link_params)} links")
    
    # Save the sklearn model
    joblib.dump(congestion_reg, os.path.join(MODELS_DIR, 'congestion_regressor.joblib'))
    
    return link_params


def train_trust_model():
    """
    Trust Model: ML classifier that learns which links are deceptive.
    
    Training phase: uses both self_reported and measured latency to CREATE LABELS.
    Runtime phase: uses ONLY self_reported features to PREDICT deception.
    
    Features (all derivable from self_reported_latency_ms alone at runtime):
    - self_reported_latency_ms (current)
    - rolling mean of self_reported
    - rolling std of self_reported
    - rate of change
    - spike indicator
    - rolling median
    - rolling min/max range
    
    Label: 1 if abs(measured - self_reported) / measured > 0.20 (20% deviation = lying)
    """
    print("\n═══ Training Trust / Deception Model ═══")
    df = pd.read_csv(TELEMETRY_CSV)
    df = df.dropna(subset=['self_reported_latency_ms', 'measured_latency_ms'])
    df = df.sort_values(['link_id', 'tick']).reset_index(drop=True)
    
    # ── Create Labels ──
    df['deviation_ratio'] = abs(df['measured_latency_ms'] - df['self_reported_latency_ms']) / df['measured_latency_ms']
    DECEPTION_THRESHOLD = 0.20
    df['is_deceptive'] = (df['deviation_ratio'] > DECEPTION_THRESHOLD).astype(int)
    
    # ── Per-link feature engineering ──
    # These features can ALL be computed from self_reported_latency_ms alone
    feature_frames = []
    link_trust_baseline = {}
    
    for link_id, group in df.groupby('link_id'):
        g = group.copy().sort_values('tick')
        
        self_lat = g['self_reported_latency_ms']
        
        # Rolling features (window=10 ticks)
        g['self_rolling_mean'] = self_lat.rolling(window=10, min_periods=1).mean()
        g['self_rolling_std'] = self_lat.rolling(window=10, min_periods=1).std().fillna(0)
        g['self_rolling_median'] = self_lat.rolling(window=10, min_periods=1).median()
        g['self_rolling_min'] = self_lat.rolling(window=10, min_periods=1).min()
        g['self_rolling_max'] = self_lat.rolling(window=10, min_periods=1).max()
        g['self_rolling_range'] = g['self_rolling_max'] - g['self_rolling_min']
        
        # Rate of change
        g['self_diff'] = self_lat.diff().fillna(0)
        g['self_rate_of_change'] = (g['self_diff'] / self_lat.shift(1)).fillna(0)
        
        # Spike detection (> 2 std from rolling mean)
        g['self_spike'] = (abs(self_lat - g['self_rolling_mean']) > 2 * g['self_rolling_std'].clip(lower=1)).astype(int)
        
        # Deviation from rolling median
        g['self_deviation_from_median'] = abs(self_lat - g['self_rolling_median'])
        
        # Coefficient of variation
        g['self_cv'] = (g['self_rolling_std'] / g['self_rolling_mean'].clip(lower=1)).fillna(0)
        
        # Baseline trust score for this link (% of honest ticks historically)
        deception_rate = g['is_deceptive'].mean()
        link_trust_baseline[link_id] = round(float(1.0 - deception_rate), 4)
        
        feature_frames.append(g)
    
    df_features = pd.concat(feature_frames, ignore_index=True)
    
    # ── Feature columns (only self_reported-based, usable at runtime) ──
    FEATURE_COLS = [
        'self_reported_latency_ms',
        'self_rolling_mean',
        'self_rolling_std',
        'self_rolling_median',
        'self_rolling_range',
        'self_diff',
        'self_rate_of_change',
        'self_spike',
        'self_deviation_from_median',
        'self_cv'
    ]
    
    X = df_features[FEATURE_COLS].values
    y = df_features['is_deceptive'].values
    
    # Handle any remaining NaN/inf
    X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    trust_clf = GradientBoostingClassifier(
        n_estimators=150, max_depth=5, random_state=42, learning_rate=0.1
    )
    trust_clf.fit(X_train, y_train)
    
    y_pred = trust_clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    print(f"  Trust classifier accuracy: {acc:.4f}")
    print(f"  Trust classifier F1-score: {f1:.4f}")
    print(f"  Deceptive links found: {sum(1 for v in link_trust_baseline.values() if v < 0.80)}")
    print(f"  Feature columns: {FEATURE_COLS}")
    
    # Save
    joblib.dump(trust_clf, os.path.join(MODELS_DIR, 'trust_classifier.joblib'))
    
    return link_trust_baseline, FEATURE_COLS


def train_targeting_model():
    """
    Targeting-Risk Model: predicts P(jammed) from traffic_share.
    
    Uses logistic regression: higher traffic_share → higher jam probability.
    This captures Chimera's strategy of targeting predictable, high-traffic routes.
    """
    print("\n═══ Training Targeting-Risk Model ═══")
    df = pd.read_csv(INCIDENT_CSV)
    df = df.dropna(subset=['traffic_share'])
    df['jammed_flag'] = df['jammed_flag'].map({True: 1, False: 0, 'True': 1, 'False': 0})
    df = df.dropna(subset=['jammed_flag'])
    
    # Features: traffic_share and derived features
    df['traffic_share_sq'] = df['traffic_share'] ** 2
    df['traffic_share_log'] = np.log1p(df['traffic_share'])
    
    FEATURE_COLS = ['traffic_share', 'traffic_share_sq', 'traffic_share_log']
    X = df[FEATURE_COLS].values
    y = df['jammed_flag'].astype(int).values
    
    X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Logistic Regression for interpretable P(jammed)
    targeting_clf = LogisticRegression(
        max_iter=1000, random_state=42, class_weight='balanced'
    )
    targeting_clf.fit(X_train, y_train)
    
    y_pred = targeting_clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    
    # Also compute jam rates per link
    link_jam_rates = {}
    for link_id, group in df.groupby('link_id'):
        jam_rate = group['jammed_flag'].mean()
        link_jam_rates[link_id] = round(float(jam_rate), 4)
    
    print(f"  Targeting model accuracy: {acc:.4f}")
    print(f"  Targeting model F1-score: {f1:.4f}")
    print(f"  Per-link jam rates: {link_jam_rates}")
    
    # Save
    joblib.dump(targeting_clf, os.path.join(MODELS_DIR, 'targeting_classifier.joblib'))
    
    # Extract logistic regression coefficients for interpretability
    coefficients = {
        'intercept': float(targeting_clf.intercept_[0]),
        'coef_traffic_share': float(targeting_clf.coef_[0][0]),
        'coef_traffic_share_sq': float(targeting_clf.coef_[0][1]),
        'coef_traffic_share_log': float(targeting_clf.coef_[0][2])
    }
    
    return link_jam_rates, coefficients, FEATURE_COLS


def main():
    print("╔══════════════════════════════════════════╗")
    print("║  Chimera Defense Model Training Suite     ║")
    print("╚══════════════════════════════════════════╝")
    
    # Train all three models
    congestion_params = train_congestion_model()
    trust_baselines, trust_features = train_trust_model()
    jam_rates, targeting_coeffs, targeting_features = train_targeting_model()
    
    # Save all params to a single JSON file
    params = {
        'congestion': {
            'per_link': congestion_params,
            'saturation_load_ratio': 0.90,
            'description': 'Polynomial curves mapping load_ratio to predicted latency (ms)'
        },
        'trust': {
            'per_link_baseline': trust_baselines,
            'feature_columns': trust_features,
            'deception_threshold': 0.20,
            'description': 'Per-link baseline trust + GBClassifier trained on self_reported features only'
        },
        'targeting': {
            'per_link_jam_rates': jam_rates,
            'logistic_coefficients': targeting_coeffs,
            'feature_columns': targeting_features,
            'description': 'Logistic regression P(jammed) from traffic_share features'
        }
    }
    
    params_path = os.path.join(MODELS_DIR, 'trained_params.json')
    with open(params_path, 'w') as f:
        json.dump(params, f, indent=2)
    
    print(f"\n✅ All models trained and saved to {MODELS_DIR}/")
    print(f"   - congestion_regressor.joblib")
    print(f"   - trust_classifier.joblib")
    print(f"   - targeting_classifier.joblib")
    print(f"   - trained_params.json")


if __name__ == '__main__':
    main()
