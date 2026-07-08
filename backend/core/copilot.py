"""
copilot.py - Analytical Co-Pilot Agent for Chimera Defense.
The core Phase 2 engine that evaluates routes dynamically hop-by-hop, invoking
three analytical sub-models at each hop to determine the optimal next step.

Architecture:
1. Parse NLP request -> extract origin, destination, message
2. While not at destination:
   a. Fetch live /state from Chimera API
   b. Evaluate ALL links in the universe using analytical sub-models
   c. Run Dijkstra with adjusted weights to find the best path
   d. Move exactly ONE hop along this path
3. Output: Unified Reporting Protocol JSON
"""

import math
from collections import defaultdict

from core.router import find_route
from simulation.physics import compute_void_distance, compute_void_travel_time
from core import chimera_api
from inference.congestion_model import predict_congestion
from inference.trust_model import compute_trust_score, correct_self_reported
from inference.targeting_model import compute_targeting_risk
from core.nlp_parser import parse_request
from simulation import universe
from simulation import chaos

# -- Normalized cost function weights --
# All components are normalized to [0, 1] before weighting.
# Weights reflect routing PRIORITY, not scale.
W_LATENCY   = 0.30   # Prefer faster routes
W_TRUST     = 0.40   # Heavily penalize deceptive links (core challenge objective)
W_TARGETING = 0.20   # Moderately avoid targeted/jammed links
W_DIVERSITY = 0.10   # Mild preference for route diversity

# -- Latency normalization bounds (from training data) --
# observed_latency_ms: 5th percentile ≈ 71k, 95th ≈ 465k
# Using 5th/95th to avoid outlier compression. Values outside are clamped.
LATENCY_MIN = 20_000.0    # ~min observed latency
LATENCY_MAX = 500_000.0   # ~95th percentile (above this → saturated territory)
MAX_REUSE   = 3           # Diversity cap: 3 reuses → fully penalized

# -- Route diversity tracking --
_recent_routes = defaultdict(int)


def evaluate_route(text=None, origin=None, destination=None,
                   message=None, api_key=None):
    """
    Main entry point for the co-pilot agent.
    Accepts either natural language text OR structured fields.
    Returns the Unified Reporting Protocol JSON schema.
    """
    # -- Step 1: Parse input --
    if text and not (origin and destination):
        parsed = parse_request(text)
        if 'error' in parsed:
            return {'error': parsed['error']}
        origin = parsed.get('origin', origin)
        destination = parsed.get('destination', destination)
        message = parsed.get('message', message or 'Hello')

    if not origin or not destination:
        return {'error': 'Missing origin or destination'}

    if not message:
        message = 'Hello'

    uni = universe.get_universe()
    node_ids = [n['id'] for n in uni['nodes']]

    if origin not in node_ids:
        return {'error': f'Unknown origin: {origin}'}
    if destination not in node_ids:
        return {'error': f'Unknown destination: {destination}'}
    if origin == destination:
        return {'error': 'Origin and destination must be different'}

    # -- Step 2: Check baseline physics route --
    baseline_route = find_route(origin, destination, uni)
    if not baseline_route:
        return {'error': f'No route exists from {origin} to {destination}'}

    # -- Step 3: Dynamic Hop-by-Hop Evaluation --
    current_node = origin
    chosen_path = [current_node]
    link_evaluations = []
    total_combined_cost = 0.0
    total_estimated_latency = 0.0
    initial_route_changed = False

    while current_node != destination:
        # Fetch live state at EACH HOP
        live_states = chimera_api.get_all_link_states(api_key)
        
        adjusted_weights = {}
        evaluations_for_hop = {}
        
        # Evaluate all links in the universe based on latest state
        for link in uni['links']:
            a = link['source']
            b = link['target']
            link_id = "-".join(sorted([a, b]))
            
            cost, eval_dict = _evaluate_link_cost(link_id, a, b, uni, live_states)
            adjusted_weights[link_id] = cost
            if eval_dict:
                evaluations_for_hop[link_id] = eval_dict

        # Run Dijkstra with AI-adjusted weights
        route = find_route(current_node, destination, uni, adjusted_weights=adjusted_weights)
        
        if not route or len(route) < 2:
            return {'status': 'undeliverable', 'error': 'Undeliverable: No safe alternate route found'}
            
        next_node = route[1]
        link_id = "-".join(sorted([current_node, next_node]))
        
        # Check if we deviated from the initial route
        if len(chosen_path) - 1 < len(baseline_route) - 1:
            if link_id != "-".join(sorted([baseline_route[len(chosen_path)-1], baseline_route[len(chosen_path)]])):
                initial_route_changed = True
        else:
            initial_route_changed = True

        # Commit to this hop
        chosen_path.append(next_node)
        eval_dict = evaluations_for_hop.get(link_id)
        if eval_dict:
            link_evaluations.append(eval_dict)
            total_combined_cost += eval_dict['combined_cost']
            total_estimated_latency += eval_dict['estimated_latency_ms']
            
            # Update route diversity tracker
            _recent_routes[link_id] += 1
            
        current_node = next_node

    # -- Step 4: Build Unified Reporting Protocol output --
    explanation_parts = []
    for eval_entry in link_evaluations:
        if eval_entry['trust_score'] < 0.5:
            explanation_parts.append(
                f"Link {eval_entry['link_id']}: trust={eval_entry['trust_score']:.2f} (Chimera footprint flagged)"
            )
        if eval_entry['targeting_risk_score'] > 0.5:
            explanation_parts.append(
                f"Link {eval_entry['link_id']}: targeting_risk={eval_entry['targeting_risk_score']:.2f} (high traffic target)"
            )

    if initial_route_changed:
        explanation_parts.insert(0, f"Rerouted from baseline path {baseline_route}")

    if not explanation_parts:
        explanation_parts.append("All links passed safety evaluation. Using optimal physics route.")

    output = {
        'origin_id': origin,
        'destination_id': destination,
        'chosen_path': chosen_path,
        'link_evaluations': link_evaluations,
        'final_latency_estimate_ms': round(total_estimated_latency, 1),
        'explanation': '; '.join(explanation_parts)
    }

    return output


def _evaluate_link_cost(link_id, current_node, next_node, uni, live_states):
    """
    Evaluates a single link using live states and the three analytical sub-models.
    Returns (combined_cost, evaluation_dict)
    """
    metadata = uni['metadata']
    node_map = {n['id']: n for n in uni['nodes']}
    node_a = node_map[current_node]
    node_b = node_map[next_node]

    # -- Get live state --
    has_live_data = bool(live_states)
    link_state = live_states.get(link_id, {}) if live_states else {}
    load_ratio = link_state.get('load_ratio', 0.0)
    self_reported_latency = link_state.get('self_reported_latency_ms')
    traffic_share = link_state.get('traffic_share', 0.0)
    status = link_state.get('status', 'ok')

    # -- Check if saturated (ONLY when we have live data) --
    if has_live_data and link_id in live_states:
        if status == 'saturated' or self_reported_latency is None:
            return float('inf'), None

    # -- Invoke sub-model 1: Congestion Prediction --
    # predicted_latency: the model's full estimate of observed latency (NOT a penalty)
    # congestion_penalty: additional latency above zero-load baseline (for cost weighting)
    predicted_latency, congestion_penalty = predict_congestion(
        link_id, load_ratio,
        link_state.get('capacity_units')
    )

    if congestion_penalty == float('inf'):
        return float('inf'), None

    # -- Invoke sub-model 2: Trust Score --
    if self_reported_latency is not None and self_reported_latency > 0:
        trust_score = compute_trust_score(link_id, self_reported_latency, load_ratio)
    else:
        from inference.trust_model import get_baseline_trust
        trust_score = get_baseline_trust(link_id)

    # -- Invoke sub-model 3: Targeting Risk --
    targeting_risk = compute_targeting_risk(link_id, traffic_share)

    # -- Compute physics baseline latency for this link --
    L = compute_void_distance(node_a, node_b, metadata)
    Tv = compute_void_travel_time(node_a, node_b, L, metadata)

    # -- Compute combined cost (for ROUTING decisions) --
    # All components normalized to [0, 1], then weighted by routing priority.
    #
    # Latency: raw ms → [0, 1] via min-max from training data
    raw_latency = Tv + congestion_penalty
    norm_latency = max(0.0, min(1.0, (raw_latency - LATENCY_MIN) / (LATENCY_MAX - LATENCY_MIN)))
    
    # Trust: already [0, 1]. Invert: low trust → high penalty.
    norm_trust_risk = 1.0 - trust_score
    
    # Targeting: already [0, 1] from logistic regression probability.
    norm_targeting = targeting_risk
    
    # Diversity: reuse count capped at MAX_REUSE.
    norm_diversity = min(_recent_routes.get(link_id, 0) / MAX_REUSE, 1.0)

    combined_cost = (
        W_LATENCY   * norm_latency +
        W_TRUST     * norm_trust_risk +
        W_TARGETING * norm_targeting +
        W_DIVERSITY * norm_diversity
    )

    # -- Estimate real latency (for REPORTING) --
    # Two independent estimates of the same quantity: actual experienced latency.
    #
    # Estimate 1 (from congestion model):
    #   predicted_latency = polyval(load_ratio), trained directly on observed_latency_ms.
    #
    # Estimate 2 (from trust correction of self-reported):
    #   corrected = self_reported / median_ratio
    #   If link historically under-reports by ratio 0.65, this scales up to reality.
    #   For honest links (ratio ≈ 1.0), corrected ≈ self_reported.
    #
    # Blend: use trust_score as confidence in the self-report pathway.
    # High trust → trust correction is reliable (ratio ≈ 1.0), lean toward it.
    # Low trust → trust correction is a rough estimate, lean toward congestion model.

    estimated_from_congestion = predicted_latency if predicted_latency > 0 else Tv

    if self_reported_latency is not None and self_reported_latency > 0:
        estimated_from_trust = correct_self_reported(link_id, self_reported_latency)
        # Blend the two estimates. Both estimate actual latency.
        # High trust → lean toward trust correction (honest links are reliable)
        # Low trust → lean toward congestion model (deceptive corrections are noisy)
        w = 1.0 - trust_score  # weight for congestion model
        estimated_latency = w * estimated_from_congestion + (1 - w) * estimated_from_trust
    else:
        estimated_latency = estimated_from_congestion

    eval_dict = {
        'link_id': link_id,
        'predicted_congestion_penalty_ms': round(congestion_penalty, 1),
        'trust_score': round(trust_score, 2),
        'targeting_risk_score': round(targeting_risk, 2),
        'combined_cost': round(combined_cost, 1),
        'estimated_latency_ms': round(estimated_latency, 1)
    }

    return combined_cost, eval_dict


def reset_diversity_tracker():
    """Reset the route diversity counter."""
    _recent_routes.clear()
