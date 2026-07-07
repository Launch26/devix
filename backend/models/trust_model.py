"""
trust_model.py - Runtime trust/deception predictor.
Uses a trained GradientBoosting classifier to predict whether a link's
self_reported_latency is deceptive, using ONLY self_reported features
(no measured_latency needed at runtime).
"""

import os
import json
import numpy as np
import joblib
from collections import defaultdict, deque

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARAMS_PATH = os.path.join(BASE_DIR, 'trained_params.json')
CLASSIFIER_PATH = os.path.join(BASE_DIR, 'trust_classifier.joblib')

_params = None
_classifier = None

# Per-link history buffer for computing rolling features at runtime
# Stores recent self_reported_latency values per link
_link_history = defaultdict(lambda: deque(maxlen=20))


def _load():
    global _params, _classifier
    if _params is None:
        with open(PARAMS_PATH, 'r') as f:
            all_params = json.load(f)
        _params = all_params['trust']
    if _classifier is None and os.path.exists(CLASSIFIER_PATH):
        _classifier = joblib.load(CLASSIFIER_PATH)


def _compute_features(link_id: str, self_reported_latency: float) -> np.ndarray:
    """
    Compute the same feature vector used during training, using only
    self_reported_latency_ms and the rolling history buffer.
    
    Features:
    - self_reported_latency_ms
    - self_rolling_mean
    - self_rolling_std
    - self_rolling_median
    - self_rolling_range  
    - self_diff
    - self_rate_of_change
    - self_spike
    - self_deviation_from_median
    - self_cv
    """
    history = _link_history[link_id]
    
    # Add current value to history
    history.append(self_reported_latency)
    
    vals = list(history)
    n = len(vals)
    
    # Rolling statistics
    rolling_mean = float(np.mean(vals))
    rolling_std = float(np.std(vals)) if n > 1 else 0.0
    rolling_median = float(np.median(vals))
    rolling_min = float(np.min(vals))
    rolling_max = float(np.max(vals))
    rolling_range = rolling_max - rolling_min
    
    # Diff and rate of change
    if n >= 2:
        self_diff = vals[-1] - vals[-2]
        prev_val = vals[-2] if vals[-2] != 0 else 1.0
        rate_of_change = self_diff / prev_val
    else:
        self_diff = 0.0
        rate_of_change = 0.0
    
    # Spike detection
    safe_std = max(rolling_std, 1.0)
    spike = 1 if abs(self_reported_latency - rolling_mean) > 2 * safe_std else 0
    
    # Deviation from median
    deviation_from_median = abs(self_reported_latency - rolling_median)
    
    # Coefficient of variation
    safe_mean = max(rolling_mean, 1.0)
    cv = rolling_std / safe_mean
    
    features = np.array([
        self_reported_latency,
        rolling_mean,
        rolling_std,
        rolling_median,
        rolling_range,
        self_diff,
        rate_of_change,
        spike,
        deviation_from_median,
        cv
    ]).reshape(1, -1)
    
    return np.nan_to_num(features, nan=0.0, posinf=0.0, neginf=0.0)


def compute_trust_score(link_id: str, self_reported_latency: float, load_ratio: float = None) -> float:
    """
    Compute trust score for a link using ONLY self_reported data.
    
    Combines:
    1. Historical baseline trust (pre-trained: how often this link lied historically)
    2. Live ML prediction (does the current self_reported value look deceptive?)
    
    Args:
        link_id: The interplanetary link identifier.
        self_reported_latency: Current self_reported_latency_ms from /state API.
        load_ratio: Optional current load_ratio (not used in features but informational).
    
    Returns:
        float: Trust score between 0.0 (definitely lying) and 1.0 (trustworthy).
    """
    _load()
    
    # Handle null/None latency (saturated links report null)
    if self_reported_latency is None or self_reported_latency <= 0:
        return 0.0
    
    # ── Historical baseline trust ──
    baseline_trust = _params['per_link_baseline'].get(link_id, 0.5)
    
    # ── Live ML prediction ──
    if _classifier is not None:
        features = _compute_features(link_id, self_reported_latency)
        # predict_proba gives [P(honest), P(deceptive)]
        try:
            proba = _classifier.predict_proba(features)[0]
            # P(honest) = trust from ML
            ml_trust = float(proba[0])
        except Exception:
            ml_trust = baseline_trust
    else:
        ml_trust = baseline_trust
    
    # ── Combine: weighted average ──
    # Give more weight to ML prediction (live) vs baseline (historical)
    combined = 0.4 * baseline_trust + 0.6 * ml_trust
    
    return round(max(0.0, min(1.0, combined)), 4)


def get_baseline_trust(link_id: str) -> float:
    """Get the pre-trained historical trust score for a link."""
    _load()
    return _params['per_link_baseline'].get(link_id, 0.5)


def is_compromised(link_id: str, threshold: float = 0.5) -> bool:
    """Check if a link is historically compromised (baseline trust below threshold)."""
    return get_baseline_trust(link_id) < threshold


def reset_history():
    """Reset the rolling history buffers (useful between test runs)."""
    _link_history.clear()
