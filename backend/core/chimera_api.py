"""
chimera_api.py - Live API client for the Chimera telemetry service.
Polls https://chimera.launch26.space/state for real-time link conditions.
"""

import os
import time
import httpx
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

CHIMERA_BASE_URL = os.getenv('CHIMERA_BASE_URL', 'https://chimera.launch26.space')
CHIMERA_API_KEY = os.getenv('CHIMERA_API_KEY', '')

# Cache to avoid over-polling
_cache = {
    'state': None,
    'timestamp': 0,
    'ttl': 5  # seconds
}


def fetch_links():
    """
    Fetch the static list of interplanetary links.
    GET /links — no API key required.
    
    Returns:
        list: Array of link objects with link_id, planet_a, planet_b, capacity_units.
    """
    try:
        resp = httpx.get(f"{CHIMERA_BASE_URL}/links", timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"[ChimeraAPI] Error fetching /links: {e}")
        return []


def fetch_live_state(api_key: str = None):
    """
    Fetch the current live state of all interplanetary links.
    GET /state — requires X-Team-Key header.
    
    The returned data contains per-link:
    - link_id, planet_a, planet_b, capacity_units
    - current_load, load_ratio
    - self_reported_latency_ms (null if saturated)
    - traffic_share
    - status ("ok" or "saturated")
    
    Uses caching to avoid over-polling (TTL-based).
    
    Returns:
        dict: { "tick": int, "links": [...] } or None on error.
    """
    global _cache
    
    now = time.time()
    if _cache['state'] and (now - _cache['timestamp'] < _cache['ttl']):
        return _cache['state']
    
    key = api_key or CHIMERA_API_KEY
    if not key:
        print("[ChimeraAPI] Warning: No API key configured. Set CHIMERA_API_KEY in .env")
        return None
    
    headers = {'X-Team-Key': key}
    
    try:
        resp = httpx.get(f"{CHIMERA_BASE_URL}/state", headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        
        _cache['state'] = data
        _cache['timestamp'] = now
        
        return data
    except httpx.HTTPStatusError as e:
        print(f"[ChimeraAPI] HTTP error: {e.response.status_code} - {e.response.text}")
        return _cache.get('state')  # Return stale cache if available
    except Exception as e:
        print(f"[ChimeraAPI] Error fetching /state: {e}")
        return _cache.get('state')


def get_link_state(link_id: str, api_key: str = None) -> dict:
    """
    Get the current state of a specific link.
    
    Args:
        link_id: e.g. "Aegis-Boreas"
        api_key: Optional override for team key.
    
    Returns:
        dict: The link state object, or None if not found.
    """
    state = fetch_live_state(api_key)
    if not state or 'links' not in state:
        return None
    
    for link in state['links']:
        if link['link_id'] == link_id:
            return link
    return None


def get_all_link_states(api_key: str = None) -> dict:
    """
    Get current state for all links as a dict keyed by link_id.
    
    Returns:
        dict: { link_id: link_state_dict, ... }
    """
    state = fetch_live_state(api_key)
    if not state or 'links' not in state:
        return {}
    
    return {link['link_id']: link for link in state['links']}


def is_link_saturated(link_state: dict) -> bool:
    """Check if a link is currently saturated (unusable)."""
    if not link_state:
        return True
    return link_state.get('status') == 'saturated' or link_state.get('self_reported_latency_ms') is None


def invalidate_cache():
    """Force the next fetch to hit the API."""
    _cache['state'] = None
    _cache['timestamp'] = 0
