import os
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.abspath(os.path.join(BASE_DIR, '..', 'models', 'trust_model.pkl'))

model_data = None
if os.path.exists(MODEL_PATH):
    model_data = joblib.load(MODEL_PATH)

def get_baseline_trust(link_id):
    """
    Returns the baseline trust score for a link based on historical telemetry data.
    Trust = alpha / (alpha + beta) = P(link is honest).
    """
    if model_data is None:
        return 0.5
    links = model_data.get('links', {})
    prior = model_data.get('global_prior', {'alpha': 1.0, 'beta': 1.0})
    
    params = links.get(link_id, prior)
    alpha = params.get('alpha', prior['alpha'])
    beta = params.get('beta', prior['beta'])
    return float(alpha / (alpha + beta))

def get_median_ratio(link_id):
    """
    Returns the historical median ratio (reported / measured) for this link.
    Honest links ≈ 1.0. Chimera-spoofed links < 1.0.
    """
    if model_data is None:
        return 1.0
    links = model_data.get('links', {})
    params = links.get(link_id)
    if params and 'median_ratio' in params:
        return float(params['median_ratio'])
    return 1.0  # Assume honest for unknown links

def correct_self_reported(link_id, self_reported_latency_ms):
    """
    Corrects the self-reported latency using the historical deception pattern.
    
    If a link historically under-reports by ratio 0.65 (reports 65% of reality),
    then: corrected = self_reported / 0.65 ≈ actual latency.
    
    For honest links (ratio ≈ 1.0), this is nearly a no-op.
    """
    median_ratio = get_median_ratio(link_id)
    if median_ratio <= 0:
        return self_reported_latency_ms  # Safety: avoid division by zero
    return self_reported_latency_ms / median_ratio

def compute_trust_score(link_id, self_reported_latency, load_ratio):
    """
    Computes the trust score dynamically. 
    Uses the baseline derived from Beta distribution.
    """
    return get_baseline_trust(link_id)

