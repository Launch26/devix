"""
copilot.py - Analytical Co-Pilot Agent for Chimera Defense.
The core Phase 2 engine that evaluates routes node-by-node, invoking
three analytical sub-models at each hop before committing to the next node.

Architecture:
1. Parse NLP request -> extract origin, destination, message
2. Get baseline physics route from Phase 1 Dijkstra
3. Fetch live /state from Chimera API
4. For EACH link in the path (sequential, node-by-node):
   a. Congestion prediction -> predicted_congestion_penalty_ms
   b. Trust evaluation -> trust_score
   c. Targeting risk -> targeting_risk_score
   d. Combined cost -> weighted composite score
   e. If unsafe -> reroute from current node, avoiding bad link
5. Output: Unified Reporting Protocol JSON
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

# -- Thresholds for rerouting --
TRUST_REROUTE_THRESHOLD = 0.35
COMBINED_COST_REROUTE_FACTOR = 3.0

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

    # -- Step 2: Get baseline physics route --
    baseline_route = find_route(origin, destination, uni)
    if not baseline_route:
        return {'error': f'No route exists from {origin} to {destination}'}

    # -- Step 3: Fetch live state --
    live_states = chimera_api.get_all_link_states(api_key)
    # live_states may be empty if API is unavailable; that's OK

    # -- Step 4: Sequential node-by-node evaluation --
    result = _evaluate_path_sequentially(
        baseline_route, uni, live_states, origin, destination, api_key
    )

    # Handle None result (shouldn't happen, but safety)
    if not result:
        result = {
            'chosen_path': baseline_route,
            'link_evaluations': [],
            'total_combined_cost': 0.0,
            'rerouted': False
        }

    # -- Step 5: Build Unified Reporting Protocol output --
    explanation_parts = []
    for eval_entry in result.get('link_evaluations', []):
        if eval_entry['trust_score'] < 0.5:
            explanation_parts.append(
                f"Link {eval_entry['link_id']}: trust={eval_entry['trust_score']:.2f} (Chimera footprint flagged)"
            )
        if eval_entry['targeting_risk_score'] > 0.5:
            explanation_parts.append(
                f"Link {eval_entry['link_id']}: targeting_risk={eval_entry['targeting_risk_score']:.2f} (high traffic target)"
            )

    if result.get('rerouted'):
        explanation_parts.insert(0, f"Rerouted from baseline path {baseline_route}")

    if not explanation_parts:
        explanation_parts.append("All links passed safety evaluation. Using optimal physics route.")

    # Update route diversity tracker
    for eval_entry in result.get('link_evaluations', []):
        _recent_routes[eval_entry['link_id']] += 1

    output = {
        'origin_id': origin,
        'destination_id': destination,
        'chosen_path': result['chosen_path'],
        'link_evaluations': result['link_evaluations'],
        'final_latency_estimate_ms': round(result['total_combined_cost'], 1),
        'explanation': '; '.join(explanation_parts)
    }

    return output


def _evaluate_path_sequentially(route, uni, live_states, origin, destination, api_key,
                                 avoided_links=None, depth=0):
    """
    Evaluate a route node-by-node, invoking all 3 sub-models at each link.
    If a link fails evaluation, reroute from the current node.
    """
    if avoided_links is None:
        avoided_links = set()

    metadata = uni['metadata']
    node_map = {n['id']: n for n in uni['nodes']}

    link_evaluations = []
    total_combined_cost = 0.0
    chosen_path = [route[0]]
    rerouted = False
    has_live_data = bool(live_states)

    i = 0
    while i < len(route) - 1:
        current_node = route[i]
        next_node = route[i + 1]

        # Construct link_id (alphabetical order per spec)
        link_id = "-".join(sorted([current_node, next_node]))

        # -- Get live state --
        link_state = live_states.get(link_id, {}) if live_states else {}
        load_ratio = link_state.get('load_ratio', 0.0)
        self_reported_latency = link_state.get('self_reported_latency_ms')
        traffic_share = link_state.get('traffic_share', 0.0)
        status = link_state.get('status', 'ok')

        # -- Check if saturated (ONLY when we have live data) --
        if has_live_data and link_id in live_states:
            if status == 'saturated' or self_reported_latency is None:
                avoided_links.add(link_id)
                if depth < 5:
                    reroute_result = _reroute_from_node(
                        current_node, destination, uni, live_states,
                        origin, api_key, avoided_links, depth,
                        link_evaluations, total_combined_cost, chosen_path
                    )
                    if reroute_result:
                        return reroute_result
                    avoided_links.discard(link_id)
                # If reroute failed or depth exceeded, add a failure entry and continue
                link_evaluations.append({
                    'link_id': link_id,
                    'predicted_congestion_penalty_ms': 999999.0,
                    'trust_score': 0.0,
                    'targeting_risk_score': 1.0,
                    'combined_cost': 999999.0
                })
                total_combined_cost += 999999.0
                chosen_path.append(next_node)
                i += 1
                continue

        # -- Invoke sub-model 1: Congestion Prediction --
        congestion_penalty = predict_congestion_penalty(
            link_id, load_ratio,
            link_state.get('capacity_units')
        )

        if congestion_penalty == float('inf'):
            # Congestion model says link is failing
            avoided_links.add(link_id)
            if depth < 5:
                reroute_result = _reroute_from_node(
                    current_node, destination, uni, live_states,
                    origin, api_key, avoided_links, depth,
                    link_evaluations, total_combined_cost, chosen_path
                )
                if reroute_result:
                    return reroute_result
                avoided_links.discard(link_id)
            congestion_penalty = 999999.0

        # -- Invoke sub-model 2: Trust Score --
        # When no live data, use baseline trust from training
        if self_reported_latency is not None and self_reported_latency > 0:
            trust_score = compute_trust_score(link_id, self_reported_latency, load_ratio)
        else:
            # No live data available - use historical baseline
            from models.trust_model import get_baseline_trust
            trust_score = get_baseline_trust(link_id)

        # -- Invoke sub-model 3: Targeting Risk --
        targeting_risk = compute_targeting_risk(link_id, traffic_share)

        # -- Compute physics baseline latency for this link --
        node_a = node_map[current_node]
        node_b = node_map[next_node]
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

        # -- Decision: should we reroute? --
        should_reroute = False

        if trust_score < TRUST_REROUTE_THRESHOLD:
            should_reroute = True

        if combined_cost > Tv * COMBINED_COST_REROUTE_FACTOR and depth < 3:
            should_reroute = True

        if should_reroute and depth < 5:
            avoided_links.add(link_id)
            reroute_result = _reroute_from_node(
                current_node, destination, uni, live_states,
                origin, api_key, avoided_links, depth,
                link_evaluations, total_combined_cost, chosen_path
            )
            if reroute_result and reroute_result.get('chosen_path'):
                return reroute_result
            # If reroute failed, proceed with current link anyway
            avoided_links.discard(link_id)

        # -- Accept this link --
        link_evaluations.append({
            'link_id': link_id,
            'predicted_congestion_penalty_ms': round(congestion_penalty, 1),
            'trust_score': round(trust_score, 2),
            'targeting_risk_score': round(targeting_risk, 2),
            'combined_cost': round(combined_cost, 1)
        })

        total_combined_cost += combined_cost
        chosen_path.append(next_node)
        i += 1

    return {
        'chosen_path': chosen_path,
        'link_evaluations': link_evaluations,
        'total_combined_cost': total_combined_cost,
        'rerouted': rerouted
    }


def _reroute_from_node(current_node, destination, uni, live_states,
                       origin, api_key, avoided_links, depth,
                       prev_evaluations, prev_cost, prev_path):
    """
    Attempt to find an alternate route from current_node to destination,
    excluding avoided_links.
    """
    original_state = chaos.get_state()
    temp_killed_links = set(original_state['killedLinks']) | avoided_links
    temp_state = {
        'killedNodes': original_state['killedNodes'],
        'killedLinks': list(temp_killed_links)
    }

    new_route = find_route(current_node, destination, uni, chaos_state=temp_state)

    if not new_route or len(new_route) < 2:
        return None

    sub_result = _evaluate_path_sequentially(
        new_route, uni, live_states,
        origin, destination, api_key,
        avoided_links, depth + 1
    )

    if sub_result:
        sub_result['link_evaluations'] = prev_evaluations + sub_result['link_evaluations']
        sub_result['total_combined_cost'] = prev_cost + sub_result['total_combined_cost']
        sub_result['chosen_path'] = prev_path[:-1] + sub_result['chosen_path']
        sub_result['rerouted'] = True

    return sub_result


def reset_diversity_tracker():
    """Reset the route diversity counter."""
    _recent_routes.clear()
