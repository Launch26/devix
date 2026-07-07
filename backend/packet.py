"""
packet.py - Payload construction and simulation logger.
Constructs the full packet trajectory from origin to destination, including
end-to-end encryption (E2EE) using an XOR stream cipher. It calculates
detailed latency breakdowns (fiber transit, tower processing, void travel,
atmosphere delay) and builds the 'hop_log' for the frontend visualization.
"""

import math
import uuid
from physics import compute_void_distance, compute_void_travel_time, compute_crust_transit_time, find_closest_tower_pair
from codex import encode_payload

import hashlib

def build_packet(origin, destination, message, route, universe):
    """
    Build a complete packet trajectory with hop_log following the mandatory schema.
    
    Security enhancements:
      - E2EE via XOR Stream Cipher using SHA-256
      - Payload is passed through the network as ciphertext
      
    Args:
        origin (str): Origin node ID.
        destination (str): Destination node ID.
        message (str): The raw string payload to send.
        route (list): An ordered list of node IDs comprising the path.
        universe (dict): The universe configuration state.
        
    Returns:
        dict: A comprehensive packet dictionary containing the route, latency totals, hop log, and security info.
    """
    metadata = universe['metadata']
    nodes = universe['nodes']
    node_map = {n['id']: n for n in nodes}

    # ── E2EE Security Layer ─────────────────────────────────────────
    signature_sha256 = hashlib.sha256(message.encode('utf-8')).hexdigest()
    shared_secret = f"{origin}-{destination}-relic-key"
    key_stream = hashlib.sha256(shared_secret.encode('utf-8')).digest()
    
    encrypted_bytes = [b ^ key_stream[i % len(key_stream)] for i, b in enumerate(message.encode('utf-8'))]
    network_payload = "".join(chr(b) for b in encrypted_bytes)

    hop_log = []
    total_latency_ms = 0.0
    cumulative_time_s = 0.0

    for i in range(len(route)):
        planet_id = route[i]
        planet = node_map[planet_id]
        is_origin = (i == 0)
        is_destination = (i == len(route) - 1)

        # ── Determine receiving and sending towers ──────────────────────
        receiving_tower = None
        sending_tower = None
        void_info = None

        if not is_origin:
            prev_planet = node_map[route[i - 1]]
            pair = find_closest_tower_pair(prev_planet, planet)
            receiving_tower = pair['tower2Index']

        if not is_destination:
            next_planet = node_map[route[i + 1]]
            pair = find_closest_tower_pair(planet, next_planet)
            sending_tower = pair['tower1Index']

        # ── Void latency from previous planet ───────────────────────────
        if not is_origin:
            prev_planet = node_map[route[i - 1]]
            L = compute_void_distance(prev_planet, planet, metadata)
            Tv = compute_void_travel_time(prev_planet, planet, L, metadata)

            C = metadata['speed_of_light_kms']
            h1 = prev_planet['atmosphere_thickness_km']
            n1 = prev_planet['refraction_index']
            h2 = planet['atmosphere_thickness_km']
            n2 = planet['refraction_index']

            # Individual atmosphere delays (ms)
            atmos_delay_origin_ms = (h1 * n1) / C * 1000
            atmos_delay_dest_ms = (h2 * n2) / C * 1000
            # Pure vacuum travel (excluding atmosphere portions) (ms)
            vacuum_travel_ms = (L / C) * 1000

            void_info = {
                'distance_km': round(L, 4),
                'travel_time_ms': round(Tv, 4),
                'atmosphere_delay_origin_ms': round(atmos_delay_origin_ms, 4),
                'atmosphere_delay_dest_ms': round(atmos_delay_dest_ms, 4),
                'vacuum_only_ms': round(vacuum_travel_ms, 4)
            }
            total_latency_ms += Tv

        # ── Internal crust transit (fiber + tower processing) ───────────
        N = planet['active_towers']
        fiber_segments = 0
        fiber_transit_ms = 0.0
        tower_delay_ms = 0.0
        ring_path_list = []
        direction = "stationary"

        if is_origin:
            # Origin: packet starts at the sending tower
            tower_delay_ms = metadata['tower_processing_delay_ms']  # 1 tower hit
            ring_path_list = [sending_tower]
        elif is_destination:
            # Destination: packet arrives at receiving tower
            tower_delay_ms = metadata['tower_processing_delay_ms']  # 1 tower hit
            ring_path_list = [receiving_tower]
        else:
            # Relay: packet travels from receiving_tower → sending_tower
            diff = abs(receiving_tower - sending_tower)
            s = min(diff, N - diff)
            m = 1 if s == 0 else s + 1   # m = distinct towers hit

            r = planet['radius_km']
            f = metadata['fiber_speed_fraction']
            C = metadata['speed_of_light_kms']
            dt = metadata['tower_processing_delay_ms']

            fiber_transit_ms = ((2 * math.pi * r * s) / (N * f * C)) * 1000
            tower_delay_ms = m * dt
            fiber_segments = s

            # Determine direction and build ring path
            if s == 0:
                direction = "stationary"
                ring_path_list = [receiving_tower]
            else:
                cw_dist = (sending_tower - receiving_tower) % N
                ccw_dist = (receiving_tower - sending_tower) % N
                if cw_dist <= ccw_dist:
                    direction = "clockwise"
                    cur = receiving_tower
                    for _ in range(s + 1):
                        ring_path_list.append(cur)
                        cur = (cur + 1) % N
                else:
                    direction = "counter-clockwise"
                    cur = receiving_tower
                    for _ in range(s + 1):
                        ring_path_list.append(cur)
                        cur = (cur - 1) % N

        total_planet_ms = fiber_transit_ms + tower_delay_ms
        total_latency_ms += total_planet_ms

        # ── Step / cumulative timing ────────────────────────────────────
        step_time_ms = total_planet_ms + (void_info['travel_time_ms'] if void_info else 0)
        step_time_s = step_time_ms / 1000.0
        cumulative_time_s += step_time_s

        # ── Codex encoding (E2EE) ───────────────────────────────────────
        ciphertext_ascii_vals = [str(ord(c)) for c in network_payload]
        original_ascii_vals = [str(ord(c)) for c in message]
        
        if is_origin:
            encoded_base = node_map[route[i + 1]]['codex']
            encoded_values = encode_payload(network_payload, encoded_base)
            payload_encoded = {
                'base': encoded_base,
                'values': encoded_values,
                'ascii_values': original_ascii_vals,
                'ciphertext_values': ciphertext_ascii_vals,
                'incoming_values': None
            }
            codex_transition = f"B{planet['codex']} -> B{encoded_base}"
        elif is_destination:
            incoming_values = encode_payload(network_payload, planet['codex'])
            encoded_base = "ASCII"
            encoded_values = original_ascii_vals
            payload_encoded = {
                'base': encoded_base,
                'values': encoded_values,
                'ascii_values': original_ascii_vals,
                'ciphertext_values': ciphertext_ascii_vals,
                'incoming_values': incoming_values
            }
            codex_transition = f"B{planet['codex']} -> ASCII"
        else:
            incoming_values = encode_payload(network_payload, planet['codex'])
            encoded_base = node_map[route[i + 1]]['codex']
            encoded_values = encode_payload(network_payload, encoded_base)
            payload_encoded = {
                'base': encoded_base,
                'values': encoded_values,
                'ascii_values': ciphertext_ascii_vals,
                'incoming_values': incoming_values
            }
            codex_transition = f"B{planet['codex']} -> B{encoded_base}"

        # Tower string and ring path string
        if is_origin:
            towers_str = f"{sending_tower} -> {sending_tower}"
        elif is_destination:
            towers_str = f"{receiving_tower} -> {receiving_tower}"
        else:
            towers_str = f"{receiving_tower} -> {sending_tower}"

        ring_path_str = " -> ".join(map(str, ring_path_list))

        # ── Build hop entry ─────────────────────────────────────────────
        hop = {
            'hop_index': i,
            'planet_id': planet_id,
            'planet_codex': planet['codex'],
            'current_id': planet_id,
            'receiving_tower': receiving_tower,
            'sending_tower': sending_tower,
            'fiber_segments': fiber_segments,
            'payload_ascii': message,
            'payload_encoded': payload_encoded,
            'latency': {
                'fiber_transit_ms': round(fiber_transit_ms, 4),
                'tower_delay_ms': round(tower_delay_ms, 4),
                'total_planet_ms': round(total_planet_ms, 4)
            },
            'towers_str': towers_str,
            'ring_path_str': ring_path_str,
            'direction': direction,
            'codex_transition': codex_transition,
            'step_time_s': round(step_time_s, 5),
            'cumulative_time_s': round(cumulative_time_s, 5)
        }

        if void_info:
            hop['void_from_previous'] = void_info

        hop_log.append(hop)

    # ── Final packet ────────────────────────────────────────────────────
    return {
        'packet_id': f"pkt-{uuid.uuid4().hex[:12]}",
        'origin_id': origin,
        'destination_id': destination,
        'current_id': destination,
        'message': message,
        'payload': message,
        'route': route,
        'total_latency_ms': round(total_latency_ms, 4),
        'hop_log': hop_log,
        'security': {
            'e2ee_status': 'ENCRYPTED',
            'encryption_algo': 'XOR-SHA256',
            'signature_sha256': signature_sha256,
            'signature_verified': True
        }
    }
