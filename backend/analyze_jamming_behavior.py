import pandas as pd
import matplotlib.pyplot as plt
import os

df = pd.read_csv('Datasets/link_incident_history.csv')
if df['jammed_flag'].dtype == object:
    df['jammed_flag'] = df['jammed_flag'].map({'True': True, 'False': False, True: True, False: False})

df = df.sort_values(by=['link_id', 'tick'])

# Compute past behavior metrics for each link
# 1. Traffic share at t-1
df['traffic_share_t_minus_1'] = df.groupby('link_id')['traffic_share'].shift(1)
# 2. Rolling average traffic share over the last 5 ticks
df['traffic_share_rolling_5'] = df.groupby('link_id')['traffic_share'].transform(lambda x: x.rolling(window=5, min_periods=1).mean())
# 3. Was it jammed in the last tick?
df['jammed_t_minus_1'] = df.groupby('link_id')['jammed_flag'].shift(1)

# Analyze a specific time step (e.g., tick 100)
tick_100 = df[df['tick'] == 100].sort_values(by='traffic_share', ascending=False)
print("=== Tick 100 Snapshot ===")
print(tick_100[['link_id', 'traffic_share', 'traffic_share_t_minus_1', 'traffic_share_rolling_5', 'jammed_flag']])
print("\n")

# Correlation analysis
print("=== Correlation with Jammed Flag ===")
corr_df = df.dropna()
corr_current = corr_df['jammed_flag'].corr(corr_df['traffic_share'])
corr_past = corr_df['jammed_flag'].corr(corr_df['traffic_share_t_minus_1'])
corr_rolling = corr_df['jammed_flag'].corr(corr_df['traffic_share_rolling_5'])
print(f"Current Traffic Share Correlation: {corr_current:.4f}")
print(f"Past (t-1) Traffic Share Correlation: {corr_past:.4f}")
print(f"Rolling 5-tick Traffic Share Correlation: {corr_rolling:.4f}")
print("\n")

# Plotting the traffic share over time for a single link
target_link = 'Aegis-Boreas'
link_df = df[df['link_id'] == target_link].copy()

plt.figure(figsize=(14, 6))
plt.plot(link_df['tick'], link_df['traffic_share'], label='Traffic Share', color='blue', alpha=0.6)
plt.plot(link_df['tick'], link_df['traffic_share_rolling_5'], label='Rolling 5-tick Avg', color='green', linestyle='--')

# Highlight jammed events
jammed_points = link_df[link_df['jammed_flag'] == True]
plt.scatter(jammed_points['tick'], jammed_points['traffic_share'], color='red', s=100, label='Jammed', zorder=5)

plt.title(f'Traffic Share and Jamming Events over Time for {target_link}')
plt.xlabel('Tick')
plt.ylabel('Traffic Share')
plt.legend()
plt.grid(True, linestyle='--', alpha=0.6)

# Limit to first 200 ticks for better visibility
plt.xlim(0, 200)

output_path = 'plots/link_timeline_analysis.png'
os.makedirs('plots', exist_ok=True)
plt.savefig(output_path, dpi=300, bbox_inches='tight')
print(f"Timeline plot saved to {output_path}")
