"use client";

import React from "react";
import { Send, Sparkles, Terminal } from "lucide-react";

interface TransmitPanelProps {
  inputMode: "structured" | "nlp";
  setInputMode: (mode: "structured" | "nlp") => void;
  nodes: any[];
  selectedOrigin: string;
  setSelectedOrigin: (v: string) => void;
  selectedDestination: string;
  setSelectedDestination: (v: string) => void;
  message: string;
  setMessage: (v: string) => void;
  nlpText: string;
  setNlpText: (v: string) => void;
  sending: boolean;
  error: string | null;
  onSend: () => void;
}

export default function TransmitPanel({
  inputMode,
  setInputMode,
  nodes,
  selectedOrigin,
  setSelectedOrigin,
  selectedDestination,
  setSelectedDestination,
  message,
  setMessage,
  nlpText,
  setNlpText,
  sending,
  error,
  onSend,
}: TransmitPanelProps) {
  const isDisabled =
    sending ||
    (inputMode === "structured" && (!selectedOrigin || !selectedDestination || !message.trim())) ||
    (inputMode === "nlp" && !nlpText.trim());

  return (
    <div className="glass-card hud-corners p-5 flex flex-col gap-4 relative overflow-hidden select-none">
      {/* Dynamic backdrop glows depending on mode */}
      <div 
        className={`absolute -right-8 -bottom-8 w-24 h-24 rounded-full blur-2xl pointer-events-none transition-all duration-500 ${
          inputMode === "nlp" ? "bg-neon-purple/10" : "bg-neon-cyan/5"
        }`} 
      />

      {/* Header with Switcher */}
      <div className="flex items-center justify-between pb-3 border-b border-neon-cyan/10">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-neon-cyan" />
          <span className="font-heading text-xs font-bold tracking-widest text-[#e2e0ec] uppercase">
            TRANSMIT MESSAGING
          </span>
        </div>

        {/* Toggle Pills */}
        <div className="flex bg-void-deep/80 p-0.5 rounded-full border border-neon-cyan/15 relative">
          <button
            onClick={() => setInputMode("structured")}
            className={`px-3 py-1 text-[9px] font-bold tracking-wider rounded-full transition-all duration-300 ${
              inputMode === "structured"
                ? "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20"
                : "text-[#9d97b5] hover:text-[#e2e0ec]"
            }`}
          >
            MANUAL
          </button>
          <button
            onClick={() => setInputMode("nlp")}
            className={`px-3 py-1 text-[9px] font-bold tracking-wider rounded-full transition-all duration-300 flex items-center gap-1 ${
              inputMode === "nlp"
                ? "bg-neon-purple/20 text-neon-purple border border-neon-purple/40"
                : "text-[#9d97b5] hover:text-[#e2e0ec]"
            }`}
          >
            <Sparkles className="w-2.5 h-2.5" />
            AI CO-PILOT
          </button>
        </div>
      </div>

      {/* Inputs Form container */}
      <div className="flex-1 flex flex-col justify-center gap-3">
        {inputMode === "structured" ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Origin Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] font-bold tracking-wider text-[#4a4560] uppercase">
                  ORIGIN PLANET
                </label>
                <select
                  className="select-glass"
                  value={selectedOrigin}
                  onChange={(e) => setSelectedOrigin(e.target.value)}
                >
                  <option value="">Origin…</option>
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.id} (Base {n.codex})
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] font-bold tracking-wider text-[#4a4560] uppercase">
                  DESTINATION
                </label>
                <select
                  className="select-glass"
                  value={selectedDestination}
                  onChange={(e) => setSelectedDestination(e.target.value)}
                >
                  <option value="">Destination…</option>
                  {nodes
                    .filter((n) => n.id !== selectedOrigin)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.id} (Base {n.codex})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Message input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[8px] font-bold tracking-wider text-[#4a4560] uppercase">
                TRANSMISSION PAYLOAD
              </label>
              <input
                className="input-glass"
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter raw signal message..."
              />
            </div>
          </div>
        ) : (
          /* NLP AI Mode */
          <div className="flex flex-col gap-1.5 flex-1 justify-center">
            <label className="text-[8px] font-bold tracking-wider text-neon-purple uppercase flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 animate-pulse" />
              NATURAL LANGUAGE CO-PILOT PROMPT
            </label>
            <textarea
              className="input-glass min-h-[96px] text-xs resize-none"
              value={nlpText}
              onChange={(e) => setNlpText(e.target.value)}
              placeholder="e.g. 'Send encrypted artifact from Gaia Prime to Atlas using safest route.'"
            />
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="px-3 py-2 bg-neon-crimson/10 border border-neon-crimson/30 rounded-btn text-neon-crimson text-[10px] font-mono">
          {error}
        </div>
      )}

      {/* Button */}
      <button
        onClick={onSend}
        disabled={isDisabled}
        className={`w-full py-3.5 rounded-btn font-bold text-[11px] tracking-[0.2em] uppercase flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer ${
          inputMode === "nlp"
            ? "bg-gradient-to-r from-neon-purple via-violet-600 to-[#7c3aed] text-white shadow-glow-purple border border-neon-purple/20 hover:shadow-glow-purple-lg hover:-translate-y-0.5"
            : "bg-gradient-to-r from-neon-cyan via-blue-500 to-[#3b82f6] text-white shadow-glow-cyan border border-neon-cyan/20 hover:shadow-glow-cyan-lg hover:-translate-y-0.5"
        } disabled:opacity-40 disabled:pointer-events-none`}
      >
        {sending ? (
          <>
            <span className="spinner w-3.5 h-3.5" />
            <span>TRANSMITTING LINK SIGNAL...</span>
          </>
        ) : (
          <>
            {inputMode === "nlp" ? (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>ENGAGE AI ROUTER</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>INITIATE TRANSMISSION</span>
              </>
            )}
          </>
        )}
      </button>
    </div>
  );
}
