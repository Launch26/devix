import os
import json
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARAMS_PATH = os.path.abspath(os.path.join(BASE_DIR, '..', 'models', 'congestion_params.json'))

params = None
if os.path.exists(PARAMS_PATH):
    with open(PARAMS_PATH, 'r') as f:
        params = json.load(f)

def predict_congestion(link_id, load_ratio, capacity_units=None):
    """
    Returns (predicted_total_latency_ms, congestion_penalty_ms).
    
    - predicted_total_latency_ms: the model's full estimate of observed latency
      at this load_ratio (trained directly on observed_latency_ms).
    - congestion_penalty_ms: the additional latency above the link's base latency
      at zero load (used for cost weighting, NOT for latency estimation).
    
    Returns (0.0, 0.0) if no model data is available.
    Returns (inf, inf) if the link is saturated.
    """
    if params is None or load_ratio is None:
        return 0.0, 0.0
    
    link_data = params.get('per_link', {}).get(link_id)
    if link_data:
        coeffs = link_data['poly_coeffs']
        base_latency = link_data['base_latency']
        sat_threshold = link_data.get('saturation_threshold', 0.90)
        
        # If traffic pushes past the invisible threshold, it is completely throttled
        if load_ratio >= sat_threshold:
            return float('inf'), float('inf')
            
        predicted_total = float(np.polyval(coeffs, load_ratio))
        penalty = max(0.0, predicted_total - base_latency)
        return max(0.0, predicted_total), penalty
    return 0.0, 0.0


# Backward-compatible wrapper
def predict_congestion_penalty(link_id, load_ratio, capacity_units=None):
    """Legacy wrapper — returns only the congestion penalty."""
    _, penalty = predict_congestion(link_id, load_ratio, capacity_units)
    return penalty

