import React from "react";
import { Music, Shuffle, Globe, Sparkles } from "lucide-react";

const PITCH_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const KEYS = [
  "C Major", "C# Major", "D Major", "D# Major", "E Major", "F Major", 
  "F# Major", "G Major", "G# Major", "A Major", "A# Major", "B Major",
  "C Minor", "C# Minor", "D Minor", "D# Minor", "E Minor", "F Minor", 
  "F# Minor", "G Minor", "G# Minor", "A Minor", "A# Minor", "B Minor"
];

function ControlPanel({
  tracks = [],
  selectedTrackIndex = 0,
  onSelectTrack,
  notationType = "western",
  onChangeNotationType,
  detectedKey = "C Major",
  targetKey = "C Major",
  onChangeTargetKey,
  saRootIndex = 2,
  onChangeSaRoot,
  autoSyncSa = true,
  onChangeAutoSyncSa,
  octaveShift = 0,
  onChangeOctaveShift
}) {
  return (
    <div className="w-full max-w-none mb-8 bg-white/40 backdrop-blur-xl border border-white/20 rounded-3xl p-6 md:p-8 shadow-[0_12px_40px_rgba(43,27,36,0.06)] relative overflow-hidden">
      
      {/* Decorative card glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-[#ffaaab]/10 blur-2xl pointer-events-none" />

      <h2 className="text-lg font-extrabold text-[#2b1b24] mb-6 flex items-center gap-2.5 tracking-wide font-royal">
        <div className="p-1.5 rounded-lg bg-[#ff5e6c]/10 border border-[#ff5e6c]/25 text-[#ff5e6c]">
          <Sparkles size={16} className="animate-pulse" />
        </div>
        Melody Settings & Scale Controls
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side: Track & Notation Selection */}
        <div className="space-y-6">
          {/* 1. Track Selection Dropdown */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#6e5c66] flex items-center gap-1.5 font-sans">
              <Music size={14} className="text-[#ff5e6c]" />
              Melody Track Selector
            </label>
            <div className="relative">
              <select
                value={selectedTrackIndex}
                onChange={(e) => onSelectTrack(Number(e.target.value))}
                className="w-full bg-white border border-[#2b1b24]/10 text-[#2b1b24] rounded-2xl px-4 py-3.5 focus:border-[#ff5e6c]/60 focus:ring-2 focus:ring-[#ff5e6c]/10 outline-none transition-all duration-300 cursor-pointer font-semibold text-sm shadow-sm"
              >
                {tracks.map((track, index) => {
                  const noteCount = track.notes?.length || 0;
                  const trackName = track.name || `Track ${index + 1}`;
                  const instName = track.instrument?.name ? `(${track.instrument.name})` : "";
                  return (
                    <option key={index} value={index} disabled={noteCount === 0} className="bg-white text-[#2b1b24] font-sans text-sm">
                      {index + 1}. {trackName} {instName} — {noteCount} notes {noteCount === 0 ? "(Empty)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* 2. Toggle Notation Mode */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#6e5c66] flex items-center gap-1.5 font-sans">
              <Globe size={14} className="text-[#ff5e6c]" />
              Notation System
            </label>
            <div className="relative p-1 bg-white/50 border border-[#2b1b24]/10 rounded-2xl flex items-center shadow-inner">
              {/* Sliding Background */}
              <div
                className={`absolute top-1 bottom-1 rounded-xl bg-gradient-to-r from-[#ff5e6c] to-[#ffaaab] shadow-md shadow-[#ff5e6c]/15 transition-all duration-300 ease-out`}
                style={{
                  width: "calc(50% - 4px)",
                  transform: notationType === "western" ? "translateX(0)" : "translateX(100%)",
                }}
              />
              
              <button
                type="button"
                onClick={() => onChangeNotationType("western")}
                className={`relative z-10 w-1/2 py-3 rounded-xl font-extrabold text-xs tracking-wider uppercase transition-all duration-300 cursor-pointer select-none ${
                  notationType === "western" ? "text-white" : "text-[#6e5c66] hover:text-[#2b1b24]"
                }`}
              >
                Western (C4, F#5)
              </button>
              
              <button
                type="button"
                onClick={() => onChangeNotationType("sargam")}
                className={`relative z-10 w-1/2 py-3 rounded-xl font-extrabold text-xs tracking-wider uppercase transition-all duration-300 cursor-pointer select-none ${
                  notationType === "sargam" ? "text-white" : "text-[#6e5c66] hover:text-[#2b1b24]"
                }`}
              >
                Sargam (Sa, Re, Ga)
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Key Detection Info & Contextual Dropdowns */}
        <div className="space-y-6 bg-white/30 border border-[#2b1b24]/10 rounded-3xl p-5 md:p-6 flex flex-col justify-between shadow-sm">
          
          {/* Key Detection Indicator */}
          <div className="flex items-center justify-between p-4 bg-white/50 border border-[#2b1b24]/10 rounded-2xl shadow-inner">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#6e5c66]">
              Original Track Key:
            </span>
            <span className="px-4 py-2 rounded-xl bg-[#feb300]/10 border border-[#feb300]/25 text-[#feb300] text-xs font-extrabold flex items-center gap-2 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-[#feb300] animate-ping" />
              {detectedKey || "C Major (Default)"}
            </span>
          </div>

          {/* Contextual Dropdowns */}
          {/* 1. Scale Transposition */}
          <div className="space-y-2.5 mt-4 md:mt-0">
            <label className="text-xs font-bold uppercase tracking-wider text-[#6e5c66] flex items-center gap-1.5 font-sans">
              <Shuffle size={14} className="text-[#ff5e6c]" />
              Target Transposition Scale
            </label>
            <div className="relative">
              <select
                value={targetKey}
                onChange={(e) => onChangeTargetKey(e.target.value)}
                className="w-full bg-white border border-[#2b1b24]/10 text-[#2b1b24] rounded-2xl px-4 py-3.5 focus:border-[#ff5e6c]/60 outline-none transition-all duration-300 cursor-pointer font-semibold text-sm shadow-sm"
              >
                {KEYS.map((k) => (
                  <option key={k} value={k} className="bg-white text-[#2b1b24]">
                    Transpose to: {k}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-[#6e5c66] font-semibold leading-normal font-manuscript italic">
              Pitches will shift based on the key distance (using sharps only).
            </p>
          </div>

          {/* 2. Sargam-specific settings */}
          {notationType === "sargam" && (
            <div className="space-y-4.5 border-t border-[#2b1b24]/10 pt-4">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#6e5c66] flex items-center gap-1.5 font-sans">
                    <Shuffle size={14} className="text-[#ff5e6c]" />
                    Scale Shift ("Set your Sa")
                  </label>
                  
                  {/* Auto-Sync Toggle */}
                  <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      checked={autoSyncSa}
                      onChange={(e) => onChangeAutoSyncSa(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-[#2b1b24]/10 bg-white accent-[#ff5e6c] cursor-pointer shadow-inner"
                    />
                    <span className="text-[9px] font-extrabold text-[#ff5e6c] group-hover:text-[#ff5e6c]/80 transition uppercase tracking-widest">
                      Auto-Sync to Key
                    </span>
                  </label>
                </div>
                
                <div className="relative">
                  <select
                    value={saRootIndex}
                    onChange={(e) => onChangeSaRoot(Number(e.target.value))}
                    disabled={autoSyncSa}
                    className={`w-full bg-white border border-[#2b1b24]/10 text-[#2b1b24] rounded-2xl px-4 py-3.5 focus:border-[#ff5e6c]/60 outline-none transition-all duration-300 cursor-pointer font-semibold text-sm shadow-sm ${
                      autoSyncSa ? "opacity-50 cursor-not-allowed select-none" : ""
                    }`}
                    title={autoSyncSa ? "Disable Auto-Sync to set Sa manually" : "Set root Sa"}
                  >
                    {PITCH_NAMES.map((name, index) => (
                      <option key={index} value={index} className="bg-white text-[#2b1b24]">
                        Set Root Sa = {name}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-[#6e5c66] font-semibold leading-normal font-manuscript italic">
                  {autoSyncSa 
                    ? `Automatically synced to original root of ${detectedKey.split(" ")[0]}.`
                    : `Standard 12-interval chromatic mapping will align relative to ${PITCH_NAMES[saRootIndex]}.`
                  }
                </p>
              </div>
            </div>
          )}
          
          {/* Octave Shift Controller (Illustrated Mechanical Keys) */}
          <div className="space-y-2.5 mt-4 border-t border-[#2b1b24]/10 pt-4">
            <label className="text-xs font-bold uppercase tracking-wider text-[#6e5c66] flex items-center gap-1.5 font-sans">
              <Shuffle size={14} className="text-[#ff5e6c]" />
              Octave Shift Register
            </label>
            <div className="flex bg-white/50 border border-[#2b1b24]/10 p-2 rounded-2xl items-center justify-between shadow-inner">
              <button
                type="button"
                onClick={() => onChangeOctaveShift(Math.max(-3, octaveShift - 1))}
                className="w-12 h-10 mechanical-key text-[#2b1b24] hover:text-[#ff5e6c] font-extrabold text-lg transition cursor-pointer select-none active:scale-95 outline-none bg-white"
                title="Shift Octave Down"
              >
                -
              </button>
              <span className="text-xs font-extrabold text-[#2b1b24] font-mono uppercase tracking-wider select-none px-4 py-2 rounded-xl bg-white border border-[#2b1b24]/10 shadow-inner">
                {octaveShift > 0 ? `+${octaveShift}` : octaveShift} Octave{Math.abs(octaveShift) !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={() => onChangeOctaveShift(Math.min(3, octaveShift + 1))}
                className="w-12 h-10 mechanical-key text-[#2b1b24] hover:text-[#feb300] font-extrabold text-lg transition cursor-pointer select-none active:scale-95 outline-none bg-white"
                title="Shift Octave Up"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(ControlPanel);
