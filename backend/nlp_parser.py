"""
nlp_parser.py - Natural Language Request Parser.
Uses the Groq LLM API to extract origin, destination, and message payload
from unstructured natural-language text, as required by the Phase 2 challenge.
Falls back to regex parsing if the LLM is unavailable.
"""

import os
import re
import json
import httpx
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
GROQ_URL = os.getenv('GROQ_URL', 'https://api.groq.com/openai/v1/chat/completions')

# All known planet names in Zeta-26
PLANET_NAMES = ['Aegis', 'Boreas', 'Caelum', 'Dawn', 'Elysium', 'Fenix']
PLANET_NAMES_LOWER = {p.lower(): p for p in PLANET_NAMES}

SYSTEM_PROMPT = """You are a routing request parser for the Zeta-26 interplanetary network.
The network has 6 planets: Aegis, Boreas, Caelum, Dawn, Elysium, Fenix.

Your job is to extract three fields from the user's natural language request:
1. origin - the source planet name
2. destination - the target planet name  
3. message - the message payload to send

Respond ONLY with valid JSON in this exact format:
{"origin": "<planet_name>", "destination": "<planet_name>", "message": "<message_text>"}

If the message/payload is not specified, use "Hello" as default.
If you cannot identify both origin and destination, respond with:
{"error": "Could not parse origin and destination from the request"}

Examples:
- "Send hello from Aegis to Fenix" → {"origin": "Aegis", "destination": "Fenix", "message": "hello"}
- "Route a packet from Dawn to Caelum with payload 'test data'" → {"origin": "Dawn", "destination": "Caelum", "message": "test data"}
- "I need to transmit 'urgent alert' between Boreas and Elysium" → {"origin": "Boreas", "destination": "Elysium", "message": "urgent alert"}
"""


def parse_request(text: str) -> dict:
    """
    Parse a natural-language routing request to extract origin, destination, and message.
    
    Attempts LLM parsing first (Groq API), falls back to regex parsing.
    
    Args:
        text: Natural language text like "Send hello from Aegis to Fenix"
    
    Returns:
        dict: {"origin": str, "destination": str, "message": str}
              or {"error": str} if parsing fails
    """
    # Try LLM first
    result = _parse_with_llm(text)
    if result and 'origin' in result and 'destination' in result:
        # Validate planet names
        origin = _normalize_planet_name(result['origin'])
        destination = _normalize_planet_name(result['destination'])
        if origin and destination:
            return {
                'origin': origin,
                'destination': destination,
                'message': result.get('message', 'Hello')
            }
    
    # Fallback to regex
    result = _parse_with_regex(text)
    if result:
        return result
    
    return {'error': f'Could not parse routing request from: "{text}"'}


def _parse_with_llm(text: str) -> dict:
    """Parse using Groq LLM API."""
    if not GROQ_API_KEY:
        return None
    
    try:
        headers = {
            'Authorization': f'Bearer {GROQ_API_KEY}',
            'Content-Type': 'application/json'
        }
        payload = {
            'model': 'llama-3.3-70b-versatile',
            'messages': [
                {'role': 'system', 'content': SYSTEM_PROMPT},
                {'role': 'user', 'content': text}
            ],
            'temperature': 0.0,
            'max_tokens': 200
        }
        
        resp = httpx.post(GROQ_URL, headers=headers, json=payload, timeout=15)
        resp.raise_for_status()
        
        content = resp.json()['choices'][0]['message']['content'].strip()
        
        # Extract JSON from response
        # Handle cases where LLM wraps in markdown code blocks
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0].strip()
        elif '```' in content:
            content = content.split('```')[1].split('```')[0].strip()
        
        return json.loads(content)
    except Exception as e:
        print(f"[NLP] LLM parsing failed: {e}")
        return None


def _parse_with_regex(text: str) -> dict:
    """
    Fallback regex parser for common routing request patterns.
    Handles patterns like:
    - "send X from A to B"
    - "route from A to B message X"  
    - "A to B: X"
    """
    text_lower = text.lower()
    
    # Find all planet name mentions in order
    found_planets = []
    for word in re.split(r'[\s,;:]+', text):
        word_clean = word.strip().lower().rstrip('.,!?')
        if word_clean in PLANET_NAMES_LOWER:
            found_planets.append(PLANET_NAMES_LOWER[word_clean])
    
    if len(found_planets) < 2:
        return None
    
    origin = found_planets[0]
    destination = found_planets[1]
    
    # Determine which came after "from" and which after "to"
    from_match = re.search(r'from\s+(\w+)', text_lower)
    to_match = re.search(r'to\s+(\w+)', text_lower)
    
    if from_match:
        from_name = _normalize_planet_name(from_match.group(1))
        if from_name:
            origin = from_name
    
    if to_match:
        to_name = _normalize_planet_name(to_match.group(1))
        if to_name:
            destination = to_name
    
    # Extract message payload
    message = 'Hello'
    
    # Try quoted strings first
    quoted = re.findall(r"['\"](.+?)['\"]", text)
    if quoted:
        message = quoted[0]
    else:
        # Try "message X" or "payload X" or "saying X"
        msg_match = re.search(r'(?:message|payload|saying|send|transmit)\s+["\']?(.+?)(?:["\']?\s*(?:from|to|$))', text, re.IGNORECASE)
        if msg_match:
            message = msg_match.group(1).strip().strip("'\"")
    
    if origin == destination:
        return None
    
    return {
        'origin': origin,
        'destination': destination,
        'message': message
    }


def _normalize_planet_name(name: str) -> str:
    """Normalize a planet name to its canonical form."""
    if not name:
        return None
    name_lower = name.lower().strip()
    if name_lower in PLANET_NAMES_LOWER:
        return PLANET_NAMES_LOWER[name_lower]
    # Fuzzy match: check if any planet name starts with the input
    for p_lower, p_proper in PLANET_NAMES_LOWER.items():
        if p_lower.startswith(name_lower) or name_lower.startswith(p_lower):
            return p_proper
    return None
