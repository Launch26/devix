"""
chaos.py - State management for network disruptions.
Keeps track of nodes and links that have been artificially 'killed'
by the user in the frontend, preventing the router from using them.
"""

killed_nodes = set()
killed_links = set()

def kill_node(node_id):
    """
    Toggles the 'killed' state of a given node. 
    If killed, it is added to the killed_nodes set; otherwise, it is removed.
    
    Args:
        node_id (str): The ID of the node to kill/restore.
    """
    if node_id in killed_nodes:
        killed_nodes.remove(node_id)
    else:
        killed_nodes.add(node_id)

def kill_link(node_a, node_b):
    """
    Toggles the 'killed' state of a bidirectional link between two nodes.
    
    Args:
        node_a (str): ID of the first node.
        node_b (str): ID of the second node.
    """
    key = "-".join(sorted([node_a, node_b]))
    if key in killed_links:
        killed_links.remove(key)
    else:
        killed_links.add(key)

def restore():
    """
    Restores the universe to its fully operational state by clearing all killed nodes and links.
    """
    killed_nodes.clear()
    killed_links.clear()

def get_state():
    """
    Retrieves the current chaos configuration.
    
    Returns:
        dict: A dictionary containing lists of 'killedNodes' and 'killedLinks'.
    """
    return {
        'killedNodes': list(killed_nodes),
        'killedLinks': list(killed_links)
    }
