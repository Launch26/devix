const API_BASE = '/api';

async function request(path, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 
        'Content-Type': 'application/json',
        'X-Relic-Api-Key': 'RELIC-RING-SECURE-26'
      },
      ...options,
    });
    const data = await res.json();
    if (!res.ok) {
      let errStr = data.error || data.detail;
      if (Array.isArray(errStr)) errStr = errStr.map(e => e.msg || JSON.stringify(e)).join(', ');
      return { data: null, error: errStr || 'Request failed' };
    }
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

export async function fetchUniverse() {
  return request('/universe');
}

export async function sendMessage(origin, destination, message) {
  return request('/send', {
    method: 'POST',
    body: JSON.stringify({ origin, destination, message }),
  });
}

export async function routeMessage(payload) {
  return request('/route', {
    method: 'POST',
    body: JSON.stringify(payload), // payload can have { text } or { origin, destination, message }
  });
}

export async function getChimeraLinks() {
  return request('/chimera/links');
}

export async function killNode(nodeId) {
  return request('/chaos/kill-node', {
    method: 'POST',
    body: JSON.stringify({ nodeId }),
  });
}

export async function killLink(nodeA, nodeB) {
  return request('/chaos/kill-link', {
    method: 'POST',
    body: JSON.stringify({ nodeA, nodeB }),
  });
}

export async function restoreAll() {
  return request('/chaos/restore', { method: 'POST' });
}

export async function getChaosState() {
  return request('/chaos/state');
}
