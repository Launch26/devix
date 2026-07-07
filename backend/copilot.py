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

from router import find_route
from physics import compute_void_distance, compute_void_travel_time
import chimera_api
from models.congestion_model import predict_congestion_penalty
from models.trust_model import compute_trust_score
from models.targeting_model import compute_targeting_risk
from nlp_parser import parse_request
import universe
import chaos

# -- Cost function weights --
CONGESTION_WEIGHT = 1.0
TRUST_PENALTY_WEIGHT = 200.0
TARGETING_RISK_WEIGHT = 150.0

# -- Route diversity tracking --
_recent_routes = defaultdict(int)
DIVERSITY_PENALTY_PER_USE = 20.0


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
        'final_latency_estimate_ms': round(total_combined_cost, 1),
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
    congestion_penalty = predict_congestion_penalty(
        link_id, load_ratio,
        link_state.get('capacity_units')
    )

    if congestion_penalty == float('inf'):
        return float('inf'), None

    # -- Invoke sub-model 2: Trust Score --
    if self_reported_latency is not None and self_reported_latency > 0:
        trust_score = compute_trust_score(link_id, self_reported_latency, load_ratio)
    else:
        from models.trust_model import get_baseline_trust
        trust_score = get_baseline_trust(link_id)

    # -- Invoke sub-model 3: Targeting Risk --
    targeting_risk = compute_targeting_risk(link_id, traffic_share)

    # -- Compute physics baseline latency for this link --
    L = compute_void_distance(node_a, node_b, metadata)
    Tv = compute_void_travel_time(node_a, node_b, L, metadata)

    # -- Compute combined cost --
    trust_penalty = (1.0 - trust_score) * TRUST_PENALTY_WEIGHT
    targeting_penalty = targeting_risk * TARGETING_RISK_WEIGHT
    diversity_penalty = _recent_routes.get(link_id, 0) * DIVERSITY_PENALTY_PER_USE

    combined_cost = (
        Tv +
        congestion_penalty * CONGESTION_WEIGHT +
        trust_penalty +
        targeting_penalty +
        diversity_penalty
    )

    eval_dict = {
        'link_id': link_id,
        'predicted_congestion_penalty_ms': round(congestion_penalty, 1),
        'trust_score': round(trust_score, 2),
        'targeting_risk_score': round(targeting_risk, 2),
        'combined_cost': round(combined_cost, 1)
    }

    return combined_cost, eval_dict


def reset_diversity_tracker():
    """Reset the route diversity counter."""
    _recent_routes.clear()
