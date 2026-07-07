"""
targeting_model.py - Runtime targeting-risk predictor.
Predicts the probability that Chimera will jam a link based on its
current traffic_share using a trained logistic regression model.
"""

import os
import json
import numpy as np
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARAMS_PATH = os.path.join(BASE_DIR, 'targeting_params.json')
CLASSIFIER_PATH = os.path.join(BASE_DIR, 'targeting_classifier.joblib')

_params = None
_classifier = None


def _load():
    global _params, _classifier
    if _params is None:
        with open(PARAMS_PATH, 'r') as f:
            _params = json.load(f)
    if _classifier is None and os.path.exists(CLASSIFIER_PATH):
        _classifier = joblib.load(CLASSIFIER_PATH)


def compute_targeting_risk(link_id: str, traffic_share: float) -> float:
    """
    Predict the probability that Chimera will jam this link.
    
    Chimera targets high-traffic links: links carrying a larger share
    of total network traffic are at greater risk of being disrupted.
    
    Args:
        link_id: The interplanetary link identifier.
        traffic_share: This link's fraction of total network traffic (0-1).
    
    Returns:
        float: Targeting risk score between 0.0 (safe) and 1.0 (high risk).
    """
    _load()
    
    if traffic_share is None or traffic_share < 0:
        traffic_share = 0.0
    
    # ── ML prediction using logistic regression ──
    if _classifier is not None:
        features = np.array([[
            traffic_share,
            traffic_share ** 2,
            np.log1p(traffic_share)
        ]])
        features = np.nan_to_num(features, nan=0.0, posinf=0.0, neginf=0.0)
        try:
            proba = _classifier.predict_proba(features)[0]
            # P(jammed) = second class probability
            ml_risk = float(proba[1]) if len(proba) > 1 else float(proba[0])
        except Exception:
            ml_risk = _fallback_risk(traffic_share)
    else:
        ml_risk = _fallback_risk(traffic_share)
    
    # ── Combine with historical jam rate ──
    historical_rate = _params['per_link_jam_rates'].get(link_id, 0.0)
    
    # Weight: 70% live ML, 30% historical baseline
    combined = 0.7 * ml_risk + 0.3 * historical_rate
    
    return round(max(0.0, min(1.0, combined)), 4)


def _fallback_risk(traffic_share: float) -> float:
    """Simple fallback if no trained model is available."""
    # Higher traffic share = higher risk, roughly logistic
    if traffic_share < 0.05:
        return 0.05
    elif traffic_share < 0.15:
        return 0.15
    elif traffic_share < 0.25:
        return 0.35
    else:
        return min(0.9, traffic_share * 2.5)


def get_historical_jam_rate(link_id: str) -> float:
    """Get the historical jam rate for a link."""
    _load()
    return _params['per_link_jam_rates'].get(link_id, 0.0)
