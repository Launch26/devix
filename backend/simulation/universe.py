"""
universe.py - Manages the state and layout of the Zeta-26 universe.
Loads configuration from `universe-config.json`, computes the exact tower
locations for each planetary node, and establishes initial communication links
between nodes based on maximum void hop distances.

Phase 2 Update: Also loads interplanetary_links from the extended config
with capacity_units for Chimera defense system.
"""

import json
import math
import os
from simulation.physics import compute_void_distance

config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'universe-config.json'))

with open(config_path, 'r', encoding='utf-8') as f:
    config = json.load(f)

metadata = config['universe_metadata']

def compute_towers(node):
    """
    Calculates the spatial (x, y) coordinates for all active towers around a planetary node,
    distributing them evenly around its circumference.
    
    Args:
        node (dict): The planetary node configuration.
        
    Returns:
        list: A list of tower dictionaries containing index and coordinates.
    """
    S = metadata['coordinate_scale_unit_km']
    cx = node['x'] * S
    cy = node['y'] * S
    N = node['active_towers']
    r = node['radius_km']
    towers = []
    
    for i in range(N):
        angle = (2 * math.pi * i) / N
        towers.append({
            'index': i,
            'x': cx + r * math.sin(angle),
            'y': cy + r * math.cos(angle)
        })
    return towers

nodes = []
for node in config['nodes']:
    n = dict(node)
    n['towers'] = compute_towers(n)
    nodes.append(n)

links = []
Lmax = metadata['max_void_hop_distance_km']
for i in range(len(nodes)):
    for j in range(i + 1, len(nodes)):
        L = compute_void_distance(nodes[i], nodes[j], metadata)
        if L <= Lmax:
            links.append({
                'source': nodes[i]['id'],
                'target': nodes[j]['id'],
                'void_distance_km': L
            })

# ── Phase 2: Load interplanetary link capacities ──
interplanetary_links = config.get('interplanetary_links', [])
link_capacities = {}
for ipl in interplanetary_links:
    link_capacities[ipl['link_id']] = {
        'planet_a': ipl['planet_a'],
        'planet_b': ipl['planet_b'],
        'capacity_units': ipl['capacity_units']
    }

def get_universe():
    """
    Returns the complete, current state of the universe.
    
    Returns:
        dict: A dictionary containing metadata, computed nodes with towers, 
              active links, and interplanetary link capacities.
    """
    return {
        'metadata': metadata,
        'nodes': nodes,
        'links': links,
        'interplanetary_links': interplanetary_links,
        'link_capacities': link_capacities
    }

def get_link_capacity(link_id):
    """Get the capacity_units for an interplanetary link."""
    info = link_capacities.get(link_id, {})
    return info.get('capacity_units', 0)

def get_all_planet_ids():
    """Return list of all planet IDs."""
    return [n['id'] for n in nodes]
