import pandas as pd
import matplotlib.pyplot as plt
import os

# Load data
df = pd.read_csv('Datasets/link_incident_history.csv')

# Ensure jammed_flag is boolean
if df['jammed_flag'].dtype == object:
    df['jammed_flag'] = df['jammed_flag'].map({'True': True, 'False': False, True: True, False: False})

# Create the plot
plt.figure(figsize=(14, 8))

# Unjammed points
unjammed = df[df['jammed_flag'] == False]
plt.scatter(
    unjammed['tick'],
    unjammed['traffic_share'],
    color='blue',
    alpha=0.3,
    label='Unjammed (Normal)'
)

# Jammed points
jammed = df[df['jammed_flag'] == True]
plt.scatter(
    jammed['tick'],
    jammed['traffic_share'],
    color='red',
    s=70,
    edgecolor='black',
    label='Jammed (Compromised)',
    zorder=5
)

plt.title('Traffic Share Behavior over Time (Jammed vs Unjammed Links)', fontsize=16)
plt.xlabel('Time Step (Tick)', fontsize=12)
plt.ylabel('Traffic Share (0 to 1)', fontsize=12)
plt.legend(title='Status')
plt.grid(True, linestyle='--', alpha=0.6)

# Save the plot
output_path = 'plots/traffic_share_incidents.png'
os.makedirs('plots', exist_ok=True)
plt.savefig(output_path, dpi=300, bbox_inches='tight')
print(f"Plot saved to {output_path}")
