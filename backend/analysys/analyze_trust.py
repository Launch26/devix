import pandas as pd
import numpy as np
import joblib

df = pd.read_csv('backend/Datasets/link_telemetry.csv')
df = df.dropna(subset=['self_reported_latency_ms', 'measured_latency_ms'])
df = df[df['measured_latency_ms'] > 0]
df['ratio'] = df['self_reported_latency_ms'] / df['measured_latency_ms']

# Per-link stats
stats = df.groupby('link_id')['ratio'].agg(['mean', 'median', 'std', 'count']).round(4)
stats = stats.sort_values('median')
print('=== Per-Link Ratio Stats (sorted by median, low = deceptive) ===')
print(stats.to_string())
print()

# Load the trained model
model = joblib.load('backend/models/trust_model.pkl')
print('=== Trained Trust Scores (sorted low to high) ===')
scores = {}
for link_id, params in model['links'].items():
    score = params['alpha'] / (params['alpha'] + params['beta'])
    scores[link_id] = round(score, 4)

for link_id in sorted(scores, key=scores.get):
    a = model['links'][link_id]['alpha']
    b = model['links'][link_id]['beta']
    median_ratio = df[df['link_id'] == link_id]['ratio'].median()
    print(f"  {link_id}: trust={scores[link_id]:.4f}  alpha={a:.1f}, beta={b:.1f}, median_ratio={median_ratio:.4f}")

print()
print(f"Honest distribution: mu={model['honest_distribution']['mu']:.4f}, sigma={model['honest_distribution']['sigma']:.4f}")

# Identify deceptive links (ratio consistently < 1.0 by a meaningful margin)
print()
print("=== Likely Deceptive Links (median ratio < 0.90) ===")
for link_id in sorted(scores, key=scores.get):
    median_ratio = df[df['link_id'] == link_id]['ratio'].median()
    if median_ratio < 0.90:
        print(f"  ** {link_id}: median_ratio={median_ratio:.4f}, trust={scores[link_id]:.4f}")
