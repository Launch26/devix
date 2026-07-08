"""
main.py - Entry point for the Zeta-26 Interplanetary Routing Simulator API.
This module defines the FastAPI application, CORS settings, and all HTTP endpoints.

Phase 1: Universe state, send messages, chaos management.
Phase 2: Chimera defense routing with analytical co-pilot agent.
"""

from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from simulation import universe
from core.router import find_route
from simulation.packet import build_packet
from simulation import chaos
from core.copilot import evaluate_route

app = FastAPI(
    title="Zeta-26 Relic Ring Protocol",
    description="Interplanetary routing with Chimera defense co-pilot agent",
    version="2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = "RELIC-RING-SECURE-26"

async def verify_api_key(x_relic_api_key: str = Header(...)):
    if x_relic_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API Key")

# ── Phase 1 Request Models ──
class SendRequest(BaseModel):
    origin: str
    destination: str
    message: str

class NodeIdRequest(BaseModel):
    nodeId: str

class LinkRequest(BaseModel):
    nodeA: str
    nodeB: str

# ── Phase 2 Request Models ──
class RouteRequest(BaseModel):
    """
    Phase 2 routing request. 
    Accepts either natural language text OR structured fields.
    The co-pilot agent handles NLP parsing and sequential route evaluation.
    """
    text: Optional[str] = None        # Natural language request
    origin: Optional[str] = None      # Structured: source planet
    destination: Optional[str] = None  # Structured: destination planet
    message: Optional[str] = None      # Message payload


# ═══════════════════════════════════════════
# Phase 1 Endpoints (backward compatible)
# ═══════════════════════════════════════════

@app.get("/api/universe")
def get_universe():
    return universe.get_universe()

@app.post("/api/send", dependencies=[Depends(verify_api_key)])
def send_message(req: SendRequest):
    uni = universe.get_universe()
    node_ids = [n['id'] for n in uni['nodes']]
    
    if req.origin not in node_ids:
        raise HTTPException(status_code=400, detail=f"Unknown origin node: {req.origin}")
    if req.destination not in node_ids:
        raise HTTPException(status_code=400, detail=f"Unknown destination node: {req.destination}")
    if req.origin == req.destination:
        raise HTTPException(status_code=400, detail="Origin and destination must be different")
        
    route = find_route(req.origin, req.destination, uni)
    if not route:
        raise HTTPException(status_code=503, detail="Undeliverable")
        
    packet = build_packet(req.origin, req.destination, req.message, route, uni)
    return packet

@app.post("/api/chaos/kill-node", dependencies=[Depends(verify_api_key)])
def kill_node(req: NodeIdRequest):
    uni = universe.get_universe()
    node_ids = [n['id'] for n in uni['nodes']]
    if req.nodeId not in node_ids:
        raise HTTPException(status_code=400, detail=f"Unknown node: {req.nodeId}")
        
    chaos.kill_node(req.nodeId)
    return {"success": True, "message": f"Node {req.nodeId} killed", "state": chaos.get_state()}

@app.post("/api/chaos/kill-link", dependencies=[Depends(verify_api_key)])
def kill_link(req: LinkRequest):
    uni = universe.get_universe()
    node_ids = [n['id'] for n in uni['nodes']]
    if req.nodeA not in node_ids or req.nodeB not in node_ids:
        raise HTTPException(status_code=400, detail=f"Unknown node in link: {req.nodeA}-{req.nodeB}")
        
    chaos.kill_link(req.nodeA, req.nodeB)
    return {"success": True, "message": f"Link {req.nodeA}-{req.nodeB} killed", "state": chaos.get_state()}

@app.post("/api/chaos/restore", dependencies=[Depends(verify_api_key)])
def restore_chaos():
    chaos.restore()
    return {"success": True, "message": "All nodes and links restored", "state": chaos.get_state()}

@app.get("/api/chaos/state")
def get_chaos_state():
    return chaos.get_state()


# ═══════════════════════════════════════════
# Phase 2 Endpoints (Chimera Defense)
# ═══════════════════════════════════════════

@app.post("/api/route", dependencies=[Depends(verify_api_key)])
def route_with_copilot(req: RouteRequest):
    """
    Phase 2 intelligent routing endpoint.
    
    Accepts either:
    - Natural language: {"text": "Send hello from Aegis to Fenix"}
    - Structured: {"origin": "Aegis", "destination": "Fenix", "message": "hello"}
    
    Returns the Unified Reporting Protocol JSON with:
    - origin_id, destination_id, chosen_path
    - link_evaluations (congestion, trust, targeting, combined cost per link)
    - final_latency_estimate_ms
    - explanation
    """
    if not req.text and not (req.origin and req.destination):
        raise HTTPException(
            status_code=400,
            detail="Provide either 'text' (natural language) or both 'origin' and 'destination'"
        )
    
    result = evaluate_route(
        text=req.text,
        origin=req.origin,
        destination=req.destination,
        message=req.message
    )
    
    if 'error' in result:
        raise HTTPException(status_code=400, detail=result['error'])
    
    return result


@app.post("/api/route_ui", dependencies=[Depends(verify_api_key)])
def route_with_copilot_ui(req: RouteRequest):
    """
    Identical to /api/route but includes the 'packet' field for the frontend UI.
    """
    if not req.text and not (req.origin and req.destination):
        raise HTTPException(
            status_code=400,
            detail="Provide either 'text' (natural language) or both 'origin' and 'destination'"
        )
    
    result = evaluate_route(
        text=req.text,
        origin=req.origin,
        destination=req.destination,
        message=req.message
    )
    
    if 'error' in result:
        raise HTTPException(status_code=400, detail=result['error'])
    
    try:
        uni = universe.get_universe()
        route = result['chosen_path']
        origin_id = result['origin_id']
        destination_id = result['destination_id']
        msg = result.get('message') or req.message or (req.text if req.text else "Hello")
        
        packet = build_packet(origin_id, destination_id, msg, route, uni)
        result['packet'] = packet
    except Exception as e:
        result['packet_error'] = str(e)
    
    return result


@app.get("/api/chimera/state")
def get_chimera_state():
    """
    Proxy endpoint to fetch the current Chimera telemetry state.
    Useful for frontend visualization of live link conditions.
    """
    from core import chimera_api
    state = chimera_api.fetch_live_state()
    if not state:
        raise HTTPException(status_code=502, detail="Could not reach Chimera API")
    return state


@app.get("/api/chimera/links")
def get_chimera_links():
    """
    Proxy endpoint for the Chimera links list.
    """
    from core import chimera_api
    links = chimera_api.fetch_links()
    return links
