"""
congestion_model.py - Inference module for the GradientBoostingRegressor congestion model.

Loads the trained GBR, OneHotEncoder, and per-link metadata at module level.
Provides predict_congestion(link_id, load_ratio) for use by the copilot.
"""

import os
import json
import numpy as np
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'models'))

REGRESSOR_PATH = os.path.join(MODELS_DIR, 'congestion_regressor.joblib')
ENCODER_PATH   = os.path.join(MODELS_DIR, 'congestion_encoder.joblib')
PARAMS_PATH    = os.path.join(MODELS_DIR, 'congestion_params.json')

# Load model artifacts at module level (once on import)
model   = joblib.load(REGRESSOR_PATH) if os.path.exists(REGRESSOR_PATH) else None
encoder = joblib.load(ENCODER_PATH)   if os.path.exists(ENCODER_PATH)   else None
params  = None
if os.path.exists(PARAMS_PATH):
    with open(PARAMS_PATH, 'r') as f:
        params = json.load(f)


def predict_congestion(link_id, load_ratio, capacity_units=None):
    """
    Predicts latency for a specific link at a given load ratio.

    Returns (predicted_total_latency_ms, congestion_penalty_ms).

    - predicted_total_latency_ms: the GBR model's full estimate of observed latency.
    - congestion_penalty_ms: additional latency above the link's baseline at zero load
      (used for cost weighting in the router, NOT for latency estimation).

    Returns (0.0, 0.0) if no model data is available.
    Returns (inf, inf) if the link is saturated.
    """
    if model is None or encoder is None or params is None or load_ratio is None:
        return 0.0, 0.0

    link_meta = params.get('per_link', {}).get(link_id)

    # Check saturation threshold
    if link_meta:
        sat_threshold = link_meta.get('saturation_threshold', 0.90)
        if load_ratio >= sat_threshold:
            return float('inf'), float('inf')

    # Build the same feature vector used during training:
    #   [load_ratio, load_ratio², load_ratio³, ...one_hot_link_id...]
    poly = np.array([[load_ratio, load_ratio ** 2, load_ratio ** 3]])

    try:
        link_ohe = encoder.transform([[link_id]])
    except Exception:
        # Unknown link — return zeros rather than crashing
        return 0.0, 0.0

    X = np.hstack([poly, link_ohe])
    predicted_total = float(model.predict(X)[0])
    predicted_total = max(0.0, predicted_total)

    # Compute congestion penalty relative to this link's baseline at zero load
    baseline = link_meta['baseline_latency'] if link_meta else 0.0
    penalty = max(0.0, predicted_total - baseline)

    return predicted_total, penalty


# Backward-compatible wrapper
def predict_congestion_penalty(link_id, load_ratio, capacity_units=None):
    """Legacy wrapper — returns only the congestion penalty."""
    _, penalty = predict_congestion(link_id, load_ratio, capacity_units)
    return penalty
