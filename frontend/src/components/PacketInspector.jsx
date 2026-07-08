import { useMemo } from 'react';

export default function PacketInspector({ packetResult, activeHop }) {
  if (!packetResult) {
    return (
      <div className="panel" id="inspector-panel">
        <div className="panel-title">
          <span className="icon">🔍</span>
          Packet Inspector
        </div>
        <div className="empty-state">
          <span className="icon">📦</span>
          Transmit a message to inspect the packet
        </div>
      </div>
    );
  }

  // Create a dynamic view of the packet that updates with the animation
  const currentPacketView = useMemo(() => {
    // Start with the base packet data
    const view = {
      origin_id: packetResult.origin_id,
      destination_id: packetResult.destination_id,
      route: packetResult.route,
      total_latency_ms: packetResult.total_latency_ms,
      // Default to the original message, will be updated during transit
      current_payload: packetResult.message, 
      status: activeHop >= 0 && activeHop < packetResult.route.length - 1 ? 'IN_TRANSIT' : 'DELIVERED',
      current_location: 'Unknown',
      hop_log: packetResult.hop_log,
    };

    if (activeHop >= 0 && packetResult.route && activeHop < packetResult.route.length) {
       view.current_location = packetResult.route[activeHop];
       // Show the encoded payload if we have hop data
       if (packetResult.hop_log && packetResult.hop_log[activeHop] && packetResult.hop_log[activeHop].payload_encoded) {
           view.current_payload = packetResult.hop_log[activeHop].payload_encoded.values;
       }
    } else if (activeHop === -1) {
        view.status = 'PENDING';
        view.current_location = packetResult.origin_id;
    } else {
        view.current_location = packetResult.destination_id;
    }

    return view;
  }, [packetResult, activeHop]);

  // Very basic syntax highlighter for JSON
  const highlightJSON = (jsonString) => {
    return jsonString.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
        } else {
          cls = 'json-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    }).replace(/([{}\[\]])/g, '<span class="json-bracket">$1</span>');
  };

  const jsonStr = JSON.stringify(currentPacketView, null, 2);
  const highlightedHtml = highlightJSON(jsonStr);

  return (
    <div className="panel" id="inspector-panel">
      <div className="panel-title">
        <span className="icon">🔍</span>
        Packet Inspector
      </div>
      <div 
        className="code-block" 
        dangerouslySetInnerHTML={{ __html: highlightedHtml }} 
      />
    </div>
  );
}
