"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";

// API utilities
import {
  fetchUniverse,
  routeMessage,
  killNode,
  killLink,
  restoreAll,
  getChaosState,
} from "../utils/api";

// Components
import LoadingScreen        from "../components/LoadingScreen";
import Header               from "../components/Header";
import StarMap              from "../components/StarMap";
import ControlConsole       from "../components/ControlConsole";
import TransmitPanel        from "../components/TransmitPanel";
import PacketAnimation      from "../components/PacketAnimation";
import AnalyticsSection     from "../components/AnalyticsSection";
import ChaosModal           from "../components/ChaosModal";

// Client-only (no SSR)
const InteractiveStarBackground = dynamic(
  () => import("../components/InteractiveStarBackground"),
  { ssr: false }
);

export default function App() {
  // ── Universe / Chaos ──────────────────────────────────────
  const [universe,    setUniverse]    = useState<any>(null);
  const [chaosState,  setChaosState]  = useState<any>({ killedNodes: [], killedLinks: [] });

  // ── Packet transmission ───────────────────────────────────
  const [packetResult,   setPacketResult]   = useState<any>(null);
  const [copilotResult,  setCopilotResult]  = useState<any>(null);
  const [animationData,  setAnimationData]  = useState<any>(null);
  const [sending,        setSending]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  // ── Route selection ───────────────────────────────────────
  const [selectedOrigin,      setSelectedOrigin]      = useState("Dawn");
  const [selectedDestination, setSelectedDestination] = useState("Aegis");
  const [message,             setMessage]             = useState("Hello Zeta-26!");

  // ── NLP mode ─────────────────────────────────────────────
  const [inputMode, setInputMode] = useState<"structured" | "nlp">("structured");
  const [nlpText,   setNlpText]   = useState("");

  // ── Animation / hops ─────────────────────────────────────
  const [animSpeed,      setAnimSpeed]      = useState(1.0); // Default to standard 1.0x warp
  const [activeHop,      setActiveHop]      = useState(-1);
  const [eventLog,       setEventLog]       = useState<any[]>([]);
  const [currentPhase,   setCurrentPhase]   = useState<any>(null);

  // ── UI state ──────────────────────────────────────────────
  const [activeTab,    setActiveTab]    = useState("map");
  const [linkA,        setLinkA]        = useState("");
  const [linkB,        setLinkB]        = useState("");
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // ── Refs ──────────────────────────────────────────────────
  const audioRef      = useRef<HTMLAudioElement>(null);
  const hasInteracted = useRef(false);

  // ─── Boot: load universe + chaos ──────────────────────────
  useEffect(() => {
    (async () => {
      const { data: uData } = await fetchUniverse();
      if (uData) setUniverse(uData);
      const { data: cData } = await getChaosState();
      if (cData) setChaosState(cData);
    })();
  }, []);

  // ─── Audio autoplay ───────────────────────────────────────
  useEffect(() => {
    if (audioRef.current && !isAudioMuted) {
      audioRef.current.play().catch(() => setIsAudioMuted(true));
    }
    const handleFirstClick = () => {
      if (!hasInteracted.current && audioRef.current) {
        hasInteracted.current = true;
        audioRef.current.play().then(() => setIsAudioMuted(false)).catch(console.error);
      }
      document.removeEventListener("click", handleFirstClick);
    };
    document.addEventListener("click", handleFirstClick);
    return () => document.removeEventListener("click", handleFirstClick);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleAudio = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    hasInteracted.current = true;
    if (!audioRef.current) return;
    if (isAudioMuted) {
      audioRef.current.play().catch(console.error);
      setIsAudioMuted(false);
    } else {
      audioRef.current.pause();
      setIsAudioMuted(true);
    }
  };

  // ─── Packet send ──────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (inputMode === "structured" && (!selectedOrigin || !selectedDestination || !message.trim())) return;
    if (inputMode === "nlp" && !nlpText.trim()) return;

    setError(null); setSending(true); setPacketResult(null);
    setCopilotResult(null); setAnimationData(null);
    setActiveHop(-1); setEventLog([]); setCurrentPhase(null);

    const payload = inputMode === "nlp"
      ? { text: nlpText }
      : { origin: selectedOrigin, destination: selectedDestination, message: message.trim() };

    const { data, error: err } = await routeMessage(payload);
    setSending(false);
    if (err) {
      setError(err);
      
      let origin = "UNKNOWN";
      let destination = "UNKNOWN";
      
      if (inputMode === "nlp") {
        const planets = ["Aegis", "Boreas", "Caelum", "Dawn", "Elysium", "Fenix"];
        const foundPlanets: string[] = [];
        const words = nlpText.split(/[^a-zA-Z]+/);
        for (const w of words) {
          const wLower = w.toLowerCase();
          const pMatch = planets.find(p => p.toLowerCase() === wLower);
          if (pMatch && !foundPlanets.includes(pMatch)) {
            foundPlanets.push(pMatch);
          }
        }
        
        if (foundPlanets.length >= 2) {
          origin = foundPlanets[0];
          destination = foundPlanets[1];
          
          const textLower = nlpText.toLowerCase();
          const fromMatch = textLower.match(/from\s+([a-z]+)/);
          const toMatch = textLower.match(/to\s+([a-z]+)/);
          if (fromMatch) {
            const p = planets.find(pl => pl.toLowerCase() === fromMatch[1]);
            if (p) origin = p;
          }
          if (toMatch) {
            const p = planets.find(pl => pl.toLowerCase() === toMatch[1]);
            if (p) destination = p;
          }
        } else if (foundPlanets.length === 1) {
          origin = foundPlanets[0];
        }
      } else {
        origin = selectedOrigin || "UNKNOWN";
        destination = selectedDestination || "UNKNOWN";
      }
      
      setCopilotResult({
        origin_id: origin,
        destination_id: destination,
        chosen_path: [],
        link_evaluations: [],
        final_latency_estimate_ms: 0,
        explanation: err,
        is_error: true
      });
      return;
    }

    setCopilotResult(data);
    const pkt = data.packet || data;
    if (pkt?.route) {
      setPacketResult(pkt);
      setAnimationData({ route: pkt.route, hopLog: pkt.hop_log, startTime: Date.now(), security: pkt.security });
    }
  }, [inputMode, selectedOrigin, selectedDestination, message, nlpText]);

  // ─── Chaos handlers ───────────────────────────────────────
  const handleKillNode = useCallback(async (nodeId: string) => {
    const { data } = await killNode(nodeId);
    if (data?.state) setChaosState(data.state);
  }, []);

  const handleKillLink = useCallback(async (a: string, b: string) => {
    const { data } = await killLink(a, b);
    if (data?.state) setChaosState(data.state);
  }, []);

  const handleRestore = useCallback(async () => {
    const { data } = await restoreAll();
    if (data?.state) setChaosState(data.state);
  }, []);

  const handlePlanetClick = useCallback((planetId: string) => {
    if (!selectedOrigin || (selectedOrigin && selectedDestination)) {
      setSelectedOrigin(planetId); setSelectedDestination("");
    } else {
      if (planetId !== selectedOrigin) setSelectedDestination(planetId);
    }
  }, [selectedOrigin, selectedDestination]);

  // ─── Derived values ───────────────────────────────────────
  const nodes       = universe?.nodes || [];
  const killedNodes = new Set<string>(chaosState?.killedNodes || []);
  const killedLinks = chaosState?.killedLinks || [];
  const hasKills    = killedNodes.size > 0 || killedLinks.length > 0;

  // ─── Loading ──────────────────────────────────────────────
  if (!universe) return <LoadingScreen />;

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="relative min-h-screen w-full flex flex-col bg-void overflow-x-hidden selection:bg-neon-cyan/30 selection:text-white">
      {/* Immersive Star background canvas */}
      <InteractiveStarBackground />

      {/* Ambient background soundtrack */}
      <audio ref={audioRef} src="/space_music.mp3" loop autoPlay />

      {/* 1. Fixed Header Navigation */}
      <Header
        isOperational={!hasKills}
        setActiveTab={setActiveTab}
      />

      {/* Vertical scrollable body content */}
      <div className="flex-1 flex flex-col z-10">
        
        {/* 2. Hero Section: 3:1 Grid Layout */}
        <section className="max-w-7xl mx-auto w-full px-6 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[calc(100vh-5.5rem)]">
          {/* Left Panel (75%): Interactive Galaxy Map */}
          <div className="lg:col-span-3 flex flex-col glass-card border border-neon-cyan/10 relative overflow-hidden h-[500px] lg:h-auto min-h-[400px]">
            {/* HUD Scan Line effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-cyan/[0.015] to-transparent h-full w-full pointer-events-none animate-scan-line" />
            
            {/* HUD Info corner tags */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-ping" />
              <span className="font-mono text-[12px] tracking-widest text-[#e4dfdf] uppercase">
                ZETA-Star System Telemetry Uplink
              </span>
            </div>

            {/* Interactive Canvas Center */}
            <div className="flex-1 w-full h-full relative">
              <StarMap
                universe={universe}
                chaosState={chaosState}
                animationData={animationData}
                activeHop={activeHop}
                setActiveHop={setActiveHop}
                selectedOrigin={selectedOrigin}
                selectedDestination={selectedDestination}
                onPlanetClick={handlePlanetClick}
                animSpeed={animSpeed}
                onAnimEvent={setEventLog}
                onPhaseChange={setCurrentPhase}
              />
            </div>
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none text-center">
              <div className="font-mono text-[12px] tracking-widest text-[#ffffff]/80 animate-bounce">
                ▼ SCROLL DOWN FOR DIAGNOSTICS & SYSTEM LOGS ▼
              </div>
            </div>
          </div>

          {/* Right Panel (25%): Stacked Command Console */}
          <div className="lg:col-span-1 flex flex-col justify-between gap-6">
            <ControlConsole
              isAudioMuted={isAudioMuted}
              toggleAudio={toggleAudio}
              setActiveTab={setActiveTab}
              nodes={nodes}
              killedNodes={killedNodes}
              killedLinks={killedLinks}
              packetResult={packetResult}
            />
          </div>
        </section>

        {/* 3. Transmission Console: Equal 2-Column Grid */}
        <section className="max-w-7xl mx-auto w-full px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Form Controls */}
          <TransmitPanel
            inputMode={inputMode}
            setInputMode={setInputMode}
            nodes={nodes}
            selectedOrigin={selectedOrigin}
            setSelectedOrigin={setSelectedOrigin}
            selectedDestination={selectedDestination}
            setSelectedDestination={setSelectedDestination}
            message={message}
            setMessage={setMessage}
            nlpText={nlpText}
            setNlpText={setNlpText}
            sending={sending}
            error={error}
            onSend={handleSend}
          />

          {/* Right Column: Routing Progress Visualizer */}
          <PacketAnimation
            packetResult={packetResult}
            sending={sending}
            activeHop={activeHop}
          />
        </section>

        {/* 4. Telemetry diagnostics scroll sections */}
        <AnalyticsSection 
          packetResult={packetResult} 
          copilotResult={copilotResult}
          eventLog={eventLog} 
        />
      </div>

      {/* ── Chaos / Kill-planet modal overlay ── */}
      <ChaosModal
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        nodes={nodes}
        killedNodes={killedNodes}
        killedLinks={killedLinks}
        hasKills={hasKills}
        linkA={linkA}
        linkB={linkB}
        setLinkA={setLinkA}
        setLinkB={setLinkB}
        onKillNode={handleKillNode}
        onKillLink={handleKillLink}
        onRestore={handleRestore}
      />
    </div>
  );
}
