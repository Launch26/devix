"""
trust_model.py - Runtime trust/deception predictor.
Uses a Bayesian Probabilistic Trust Model (Beta-distribution based).
Trust score is mathematically pre-calculated during the training phase.
"""

import os
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'trust_model.pkl')

_model_data = None


def _load():
    global _model_data
    if _model_data is None and os.path.exists(MODEL_PATH):
        _model_data = joblib.load(MODEL_PATH)


def compute_trust_score(link_id: str, self_reported_latency: float = None, load_ratio: float = None) -> float:
    """
    Compute trust score for a link.
    
    The probabilistic trust model evaluates: alpha / (alpha + beta)
    Since alpha and beta are based on historical measured vs reported deviations,
    we just retrieve the static probability.
    
    Args:
        link_id: The interplanetary link identifier.
        self_reported_latency: (Unused but kept for API compatibility).
        load_ratio: (Unused but kept for API compatibility).
    
    Returns:
        float: Trust score between 0.0 (definitely lying) and 1.0 (trustworthy).
    """
    _load()
    
    if not _model_data:
        return 0.5
    
    links = _model_data.get('links', {})
    global_prior = _model_data.get('global_prior', {'alpha': 1.0, 'beta': 1.0})
    
    if link_id in links:
        alpha = links[link_id]['alpha']
        beta = links[link_id]['beta']
    else:
        alpha = global_prior['alpha']
        beta = global_prior['beta']
        
    return round(alpha / (alpha + beta), 4)


def get_baseline_trust(link_id: str) -> float:
    """Get the pre-trained historical trust score for a link."""
    return compute_trust_score(link_id)


def is_compromised(link_id: str, threshold: float = 0.5) -> bool:
    """Check if a link is historically compromised (baseline trust below threshold)."""
    return get_baseline_trust(link_id) < threshold


def reset_history():
    """Reset the rolling history buffers (no-op in new Bayesian model)."""
    pass
