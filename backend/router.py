"""
router.py - Network routing logic.
Implements Dijkstra's shortest path algorithm to find the optimal route
between an origin and destination node. It takes into account current 'chaos'
conditions (killed nodes or links) to dynamically re-route traffic.
"""

import chaos
from physics import compute_void_distance, compute_void_travel_time

def find_route(origin, destination, universe, chaos_state=None, avoided_links=None):
    """
    Finds the shortest path (in terms of travel time latency) between origin and destination nodes.
    Uses Dijkstra's algorithm. Ignores nodes and links that are currently marked as killed in the chaos state,
    as well as any links in the avoided_links set (used by the Phase 2 co-pilot for dynamic rerouting).
    
    Args:
        origin (str): ID of the starting node.
        destination (str): ID of the target node.
        universe (dict): The universe state containing nodes, links, and metadata.
        chaos_state (dict, optional): Current state of killed nodes/links. Defaults to None.
        avoided_links (set, optional): Additional link IDs to exclude from routing.
        
    Returns:
        list or None: An ordered list of node IDs representing the route, or None if no path exists.
    """
    metadata = universe['metadata']
    nodes = universe['nodes']
    links = universe['links']
    
    state = chaos_state or chaos.get_state()
    killed_nodes = set(state['killedNodes'])
    killed_links = set(state['killedLinks'])
    if avoided_links:
        killed_links = killed_links | set(avoided_links)
    
    if origin in killed_nodes or destination in killed_nodes:
        return None
        
    node_map = {n['id']: n for n in nodes}
    adj = {n['id']: [] for n in nodes if n['id'] not in killed_nodes}
    
    for link in links:
        a = link['source']
        b = link['target']
        if a in killed_nodes or b in killed_nodes:
            continue
            
        key = "-".join(sorted([a, b]))
        if key in killed_links:
            continue
            
        L = compute_void_distance(node_map[a], node_map[b], metadata)
        Tv = compute_void_travel_time(node_map[a], node_map[b], L, metadata)
        
        if a in adj: adj[a].append({'to': b, 'weight': Tv})
        if b in adj: adj[b].append({'to': a, 'weight': Tv})
        
    dist = {id: float('inf') for id in adj.keys()}
    if origin not in dist:
        return None
    dist[origin] = 0
    prev = {}
    visited = set()
    
    while True:
        u = None
        u_dist = float('inf')
        for id in adj.keys():
            if id not in visited and dist[id] < u_dist:
                u = id
                u_dist = dist[id]
                
        if u is None or u == destination:
            break
            
        visited.add(u)
        
        for edge in adj[u]:
            if edge['to'] in visited:
                continue
            alt = dist[u] + edge['weight']
            if alt < dist[edge['to']]:
                dist[edge['to']] = alt
                prev[edge['to']] = u
                
    if dist.get(destination, float('inf')) == float('inf'):
        return None
        
    path = []
    cur = destination
    while cur is not None:
        path.insert(0, cur)
        cur = prev.get(cur)
        
    return path
