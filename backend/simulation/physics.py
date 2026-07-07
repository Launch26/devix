"""
physics.py - Mathematical calculations for space and planetary physics.
Contains functions for calculating distances between planets (void distance),
light travel time factoring in atmospheric refraction, fiber transit times
across planetary crusts, and finding optimal tower pairings between nodes.
"""

import math

def compute_void_distance(node1, node2, metadata):
    """
    Calculates the absolute void (vacuum) distance between the outer atmospheres of two planets.
    
    Args:
        node1, node2 (dict): Planet objects.
        metadata (dict): Universe metadata containing scale configuration.
        
    Returns:
        float: The distance in kilometers between the edge of each planet's atmosphere.
    """
    S = metadata['coordinate_scale_unit_km']
    dx = node1['x'] - node2['x']
    dy = node1['y'] - node2['y']
    center_dist = S * math.sqrt(dx*dx + dy*dy)
    L = center_dist - (node1['radius_km'] + node1['atmosphere_thickness_km']) - (node2['radius_km'] + node2['atmosphere_thickness_km'])
    return L

def compute_void_travel_time(node1, node2, L, metadata):
    """
    Computes the total time required for a signal to cross the void between two planets, 
    accounting for the atmospheric refraction delays on both ends.
    
    Args:
        node1, node2 (dict): Planet objects.
        L (float): The vacuum void distance in kilometers between the planets.
        metadata (dict): Universe metadata containing speed of light configuration.
        
    Returns:
        float: Total transit time in milliseconds.
    """
    C = metadata['speed_of_light_kms']
    h1 = node1['atmosphere_thickness_km']
    n1 = node1['refraction_index']
    h2 = node2['atmosphere_thickness_km']
    n2 = node2['refraction_index']
    Tv = ((h1 * n1 + h2 * n2 + L) / C) * 1000
    return Tv

def compute_crust_transit_time(planet, entry_tower, exit_tower, metadata):
    """
    Calculates the time it takes for a signal to travel internally around a planet 
    from an entry tower to an exit tower via fiber optics.
    
    Args:
        planet (dict): The planet node object.
        entry_tower (int): Index of the tower where the signal arrives.
        exit_tower (int): Index of the tower from which the signal departs.
        metadata (dict): Universe metadata containing fiber speed and tower delays.
        
    Returns:
        float: Total internal crust processing and transit time in milliseconds.
    """
    r = planet['radius_km']
    N = planet['active_towers']
    f = metadata['fiber_speed_fraction']
    C = metadata['speed_of_light_kms']
    dt = metadata['tower_processing_delay_ms']
    
    diff = abs(entry_tower - exit_tower)
    s = min(diff, N - diff)
    
    m = 1 if s == 0 else s + 1
    fiber_time = ((2 * math.pi * r * s) / (N * f * C)) * 1000
    Tp = fiber_time + m * dt
    return Tp

def find_closest_tower_pair(node1, node2):
    """
    Determines the most optimal (closest physical distance) pair of towers between two planets 
    to establish a transmission link.
    
    Args:
        node1, node2 (dict): The two planet objects to connect.
        
    Returns:
        dict: A dictionary containing 'tower1Index' and 'tower2Index' for the best connection points.
    """
    best_dist = float('inf')
    best = {'tower1Index': 0, 'tower2Index': 0}
    
    for t1 in node1['towers']:
        for t2 in node2['towers']:
            dx = t1['x'] - t2['x']
            dy = t1['y'] - t2['y']
            d = dx*dx + dy*dy
            if d < best_dist:
                best_dist = d
                best = {'tower1Index': t1['index'], 'tower2Index': t2['index']}
    return best
