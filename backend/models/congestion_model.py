"""
congestion_model.py - Runtime congestion penalty predictor.
Uses trained parameters to predict Chimera's artificial latency penalties
based on a link's current load_ratio.
"""

import os
import json
import numpy as np
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARAMS_PATH = os.path.join(BASE_DIR, 'congestion_params.json')
REGRESSOR_PATH = os.path.join(BASE_DIR, 'congestion_regressor.joblib')

_params = None
_regressor = None


def _load():
    global _params, _regressor
    if _params is None:
        with open(PARAMS_PATH, 'r') as f:
            _params = json.load(f)
    if _regressor is None and os.path.exists(REGRESSOR_PATH):
        _regressor = joblib.load(REGRESSOR_PATH)


def predict_congestion_penalty(link_id: str, load_ratio: float, capacity_units: int = None) -> float:
    """
    Predict the congestion-induced latency penalty (ms) for a link.
    
    Args:
        link_id: The interplanetary link identifier.
        load_ratio: Current load / capacity ratio (0-1).
        capacity_units: The link's total capacity (informational).
    
    Returns:
        float: Predicted extra latency penalty in ms.
               Returns float('inf') if link is saturated.
    """
    _load()
    
    # If link is at or above saturation threshold, it's unusable
    sat_threshold = _params.get('saturation_load_ratio', 0.90)
    link_data = _params['per_link'].get(link_id, {})
    if link_data:
        sat_threshold = link_data.get('saturation_threshold', sat_threshold)
    
    if load_ratio >= sat_threshold:
        return float('inf')
    
    # Use per-link polynomial if available
    if link_id in _params['per_link'] and 'poly_coeffs' in _params['per_link'][link_id]:
        coeffs = _params['per_link'][link_id]['poly_coeffs']
        base_latency = _params['per_link'][link_id].get('base_latency', 0)
        predicted_latency = float(np.polyval(coeffs, load_ratio))
        # Penalty = predicted latency above base
        penalty = max(0, predicted_latency - base_latency)
        return round(penalty, 2)
    
    # Fallback: use global regressor
    if _regressor is not None:
        X = np.array([[load_ratio, load_ratio**2, load_ratio**3]])
        predicted = _regressor.predict(X)[0]
        # Estimate base latency at load_ratio=0
        X_base = np.array([[0.0, 0.0, 0.0]])
        base = _regressor.predict(X_base)[0]
        penalty = max(0, predicted - base)
        return round(penalty, 2)
    
    # Ultimate fallback: exponential estimate
    if load_ratio < 0.3:
        return 0.0
    elif load_ratio < 0.6:
        return round(load_ratio * 100, 2)
    else:
        return round((load_ratio ** 3) * 1000, 2)


def get_saturation_threshold(link_id: str) -> float:
    """Get the learned saturation threshold for a specific link."""
    _load()
    link_data = _params['per_link'].get(link_id, {})
    return link_data.get('saturation_threshold', _params.get('saturation_load_ratio', 0.90))
