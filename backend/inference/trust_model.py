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
    """
    if model_data is None:
        return 0.5
    links = model_data.get('links', {})
    prior = model_data.get('global_prior', {'alpha': 1.0, 'beta': 1.0})
    
    params = links.get(link_id, prior)
    alpha = params.get('alpha', prior['alpha'])
    beta = params.get('beta', prior['beta'])
    return float(alpha / (alpha + beta))

def compute_trust_score(link_id, self_reported_latency, load_ratio):
    """
    Computes the trust score dynamically. 
    Uses the baseline derived from Beta distribution.
    """
    return get_baseline_trust(link_id)
