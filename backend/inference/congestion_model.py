import os
import json
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARAMS_PATH = os.path.abspath(os.path.join(BASE_DIR, '..', 'models', 'congestion_params.json'))

params = None
if os.path.exists(PARAMS_PATH):
    with open(PARAMS_PATH, 'r') as f:
        params = json.load(f)

def predict_congestion_penalty(link_id, load_ratio, capacity_units=None):
    """
    Predicts the added latency (penalty) for a link based on its current load ratio.
    """
    if params is None or load_ratio is None:
        return 0.0
    
    link_data = params.get('per_link', {}).get(link_id)
    if link_data:
        coeffs = link_data['poly_coeffs']
        base_latency = link_data['base_latency']
        predicted_latency = np.polyval(coeffs, load_ratio)
        penalty = predicted_latency - base_latency
        return max(0.0, float(penalty))
    return 0.0
