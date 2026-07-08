import pandas as pd
import numpy as np
import json
import math

uni = json.load(open('Datasets/universe-config.json'))
meta = uni['universe_metadata']
nodes = {n['id']: n for n in uni['nodes']}
C = meta['speed_of_light_kms']

print("=== Physics Travel Time (Tv) ===")
tvs = []
for link in uni['interplanetary_links']:
    a, b = nodes[link['planet_a']], nodes[link['planet_b']]
    S = meta['coordinate_scale_unit_km']
    dx = a['x'] - b['x']
    dy = a['y'] - b['y']
    center_dist = S * math.sqrt(dx*dx + dy*dy)
    L = center_dist - (a['radius_km'] + a['atmosphere_thickness_km']) - (b['radius_km'] + b['atmosphere_thickness_km'])
    h1, n1 = a['atmosphere_thickness_km'], a['refraction_index']
    h2, n2 = b['atmosphere_thickness_km'], b['refraction_index']
    Tv = ((h1*n1 + h2*n2 + L) / C) * 1000
    tvs.append(Tv)
    link_id = link.get('link_id', "-".join(sorted([link['planet_a'], link['planet_b']])))
    print(f"  {link_id}: Tv = {Tv:.1f} ms")
print(f"  RANGE: {min(tvs):.0f} - {max(tvs):.0f} ms")

# Congestion penalty scale
print("\n=== Congestion (observed_latency_ms) ===")
df = pd.read_csv('Datasets/link_traffic_history.csv')
df_ok = df[df['status'] == 'ok']
print(f"  min    = {df_ok['observed_latency_ms'].min():.0f}")
print(f"  median = {df_ok['observed_latency_ms'].median():.0f}")
print(f"  95th   = {df_ok['observed_latency_ms'].quantile(0.95):.0f}")
print(f"  max    = {df_ok['observed_latency_ms'].max():.0f}")

# Per-link congestion penalty range
print("\n  Per-link congestion penalty (observed - base_at_zero_load):")
cong = json.load(open('models/congestion_params.json'))
for lid, lp in cong['per_link'].items():
    base = lp['base_latency']
    coeffs = lp['poly_coeffs']
    # Predict at load_ratio = 0.85 (near saturation)
    pred_high = np.polyval(coeffs, 0.85)
    penalty_high = pred_high - base
    pred_mid = np.polyval(coeffs, 0.5)
    penalty_mid = pred_mid - base
    print(f"  {lid}: base={base:.0f}ms  penalty@0.5={penalty_mid:.0f}ms  penalty@0.85={penalty_high:.0f}ms")

# Trust penalty scale
print("\n=== Trust Penalty: (1 - trust_score) * WEIGHT ===")
print(f"  Current TRUST_PENALTY_WEIGHT = 200")
print(f"  Deceptive (trust=0.15): (1-0.15)*200 = {(1-0.15)*200:.0f}")
print(f"  Honest   (trust=0.55): (1-0.55)*200 = {(1-0.55)*200:.0f}")

# Targeting risk scale
print("\n=== Targeting Penalty: targeting_risk * WEIGHT ===")
print(f"  Current TARGETING_RISK_WEIGHT = 150")
df_inc = pd.read_csv('Datasets/link_incident_history.csv')
df_inc['jammed_flag'] = df_inc['jammed_flag'].map({True: 1, False: 0, 'True': 1, 'False': 0})
per_link = df_inc.groupby('link_id')['jammed_flag'].mean()
for lid in sorted(per_link.index):
    print(f"  {lid}: jam_rate={per_link[lid]:.4f}  penalty={per_link[lid]*150:.1f}")

# Summary
print("\n" + "="*60)
print("  SCALE COMPARISON (all in the same cost space)")
print("="*60)
print(f"  Tv (physics):     {min(tvs):.0f} - {max(tvs):.0f}")
print(f"  Congestion pen:   0 - ~{df_ok['observed_latency_ms'].max():.0f} (penalty above base)")
print(f"  Trust penalty:    {(1-0.56)*200:.0f} - {(1-0.15)*200:.0f}  (with WEIGHT=200)")
print(f"  Targeting pen:    0 - 150  (with WEIGHT=150)")
print(f"  Diversity pen:    0, 20, 40, ...  (per reuse)")
print()
print("  Q: Does trust_penalty (88-170) actually affect routing")
print("     when Tv alone is thousands of ms?")
