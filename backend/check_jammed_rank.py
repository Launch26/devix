import pandas as pd

df = pd.read_csv('Datasets/link_incident_history.csv')
if df['jammed_flag'].dtype == object:
    df['jammed_flag'] = df['jammed_flag'].map({'True': True, 'False': False, True: True, False: False})

# Calculate the rank of traffic share for each link within each tick
# ascending=False means highest traffic share gets rank 1
df['traffic_rank'] = df.groupby('tick')['traffic_share'].rank(method='min', ascending=False)

# Filter only jammed events
jammed_events = df[df['jammed_flag'] == True]

# Count how many times the jammed link was rank 1, 2, 3, etc.
rank_counts = jammed_events['traffic_rank'].value_counts().sort_index()

total_jams = len(jammed_events)
print(f"Total jamming incidents across all ticks: {total_jams}")
print("\nBreakdown of Jammed Links by their Traffic Share Rank in that Tick:")
print("(Rank 1 = Link with the highest traffic share in that tick)")
print("-" * 65)

cumulative = 0
for rank, count in rank_counts.items():
    pct = (count / total_jams) * 100
    cumulative += pct
    print(f"Rank {int(rank):2d}: {count:4d} incidents ({pct:5.1f}%) | Cumulative: {cumulative:5.1f}%")

# Let's also see what percentage of ticks had at least one jam, 
# and how many jams per tick on average
total_ticks = df['tick'].nunique()
ticks_with_jams = jammed_events['tick'].nunique()
print("\n" + "-" * 65)
print(f"Total time steps (ticks): {total_ticks}")
print(f"Time steps with at least one jamming incident: {ticks_with_jams} ({(ticks_with_jams/total_ticks)*100:.1f}%)")

jams_per_tick = jammed_events.groupby('tick').size()
print(f"Average number of links jammed per tick (when a jam occurs): {jams_per_tick.mean():.2f}")
print(f"Max links jammed in a single tick: {jams_per_tick.max()}")
