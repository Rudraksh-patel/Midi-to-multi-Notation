import React, { useMemo, useState } from "react";
import { Eye, Layers, Sparkles } from "lucide-react";

export default function VisualPianoRoll({
  midiData,
  selectedTrackIndex,
  skylineNotes = [],
  isPlaying = false,
  playbackTime = 0,
  onSeek
}) {
  const pianoRollData = useMemo(() => {
    if (!midiData || !midiData.tracks) return null;

    // 1. Gather all notes to compute total dimensions
    const allNotes = [];
    const melodyNotes = (midiData.tracks[selectedTrackIndex]?.notes || []).map(n => ({
      pitch: n.midi,
      time: n.time,
      duration: n.duration
    }));
    
    // Add other tracks
    midiData.tracks.forEach((track, idx) => {
      if (idx !== selectedTrackIndex) {
        const mapped = (track.notes || []).map(n => ({
          pitch: n.midi,
          time: n.time,
          duration: n.duration
        }));
        allNotes.push(...mapped);
      }
    });

    if (allNotes.length === 0 && melodyNotes.length === 0) return null;

    // Get time range
    const times = [...allNotes, ...melodyNotes].map(n => n.time);
    const pitches = [...allNotes, ...melodyNotes].map(n => n.pitch);

    const minTime = 0;
    const maxTime = Math.max(...times, 5); // Minimum 5s
    
    const minPitch = Math.max(0, Math.min(...pitches, 48) - 4);
    const maxPitch = Math.min(127, Math.max(...pitches, 72) + 4);

    return {
      minTime,
      maxTime,
      minPitch,
      maxPitch,
      melodyNotes,
      otherNotes: allNotes
    };
  }, [midiData, selectedTrackIndex]);

  if (!pianoRollData) return null;

  const { minTime, maxTime, minPitch, maxPitch, melodyNotes, otherNotes } = pianoRollData;

  const width = 800;
  const height = 180;
  const paddingX = 16;
  const paddingY = 16;

  const getCoords = (time, pitch, duration) => {
    const usableWidth = width - paddingX * 2;
    const usableHeight = height - paddingY * 2;

    const x = paddingX + ((time - minTime) / (maxTime - minTime)) * usableWidth;
    const w = Math.max(2, (duration / (maxTime - minTime)) * usableWidth);

    const pitchRange = maxPitch - minPitch || 1;
    const y = paddingY + (1 - (pitch - minPitch) / pitchRange) * usableHeight;

    return { x, y, w, h: 4 };
  };

  // Convert skyline notes into a quick-lookup Set for matching
  const skylineLookup = useMemo(() => new Set(
    skylineNotes.map(n => `${n.time.toFixed(3)}-${n.pitch}`)
  ), [skylineNotes]);



  // Memoize harmony/background tracks elements
  const harmonyNotesElements = useMemo(() => {
    return otherNotes.map((note, idx) => {
      const coords = getCoords(note.time, note.pitch, note.duration);
      return (
        <rect
          key={`other-${idx}`}
          x={coords.x}
          y={coords.y}
          width={coords.w}
          height={coords.h}
          rx={1.5}
          fill="rgba(43, 27, 36, 0.09)"
          className="transition-all duration-300"
        />
      );
    });
  }, [otherNotes, minTime, maxTime, minPitch, maxPitch]);

  // Memoize lead melody track elements
  const melodyNotesElements = useMemo(() => {
    return melodyNotes.map((note, idx) => {
      const coords = getCoords(note.time, note.pitch, note.duration);
      const isSkyline = skylineLookup.has(`${note.time.toFixed(3)}-${note.pitch}`);
      return (
        <rect
          key={`melody-${idx}`}
          x={coords.x}
          y={coords.y}
          width={coords.w}
          height={coords.h}
          rx={1.5}
          fill={isSkyline ? "url(#coral-yellow-gradient)" : "rgba(255, 94, 108, 0.05)"}
          stroke={isSkyline ? "rgba(255, 94, 108, 0.7)" : "rgba(255, 94, 108, 0.12)"}
          strokeWidth={isSkyline ? 1 : 0.5}
          style={{
            transition: "fill 0.3s ease, stroke 0.3s ease"
          }}
        />
      );
    });
  }, [melodyNotes, skylineLookup, minTime, maxTime, minPitch, maxPitch]);

  return (
    <div className={`w-full max-w-none mb-8 bg-white/40 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-[0_12px_40px_rgba(43,27,36,0.06)] relative overflow-hidden border-beam-container ${isPlaying ? 'border-beam-active' : ''}`}>
      
      {/* Dynamic ambient card glow */}
      <div className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full bg-[#ffaaab]/10 blur-2xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 mb-5 relative z-10">
        <div>
          <h2 className="text-lg font-extrabold text-[#2b1b24] flex items-center gap-2.5 tracking-wide font-royal">
            <div className="p-1.5 rounded-lg bg-[#ff5e6c]/10 border border-[#ff5e6c]/25 text-[#ff5e6c]">
              <Layers size={16} />
            </div>
            Visual MIDI Melody Analyzer
          </h2>
          <p className="text-xs text-[#6e5c66] font-manuscript mt-1">
            Visualizing skyline filtering: only high-pitch notes survive (pink-yellow gradient).{isPlaying && onSeek ? " Click anywhere to seek." : ""}
          </p>
          {/* Keyboard shortcut hints styled as physical keycaps */}
          <div className="flex flex-wrap gap-2 mt-3.5">
            <span className="px-2.5 py-1 text-[9px] font-extrabold text-[#2b1b24] mechanical-key select-none uppercase tracking-wider">Space Bar 🌌 Play/Pause</span>
            <span className="px-2.5 py-1 text-[9px] font-extrabold text-[#2b1b24] mechanical-key select-none uppercase tracking-wider">Esc 🛑 Stop</span>
            <span className="px-2.5 py-1 text-[9px] font-extrabold text-[#2b1b24] mechanical-key select-none uppercase tracking-wider">↑ ↓ Octave Shift</span>
          </div>
        </div>
        
        {/* Toggle & Legend Stack */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto justify-end">


          {/* Color Legend */}
          <div className="flex items-center gap-4.5 text-[10px] font-extrabold uppercase tracking-widest bg-white/30 border border-white/10 px-4 py-2.5 rounded-2xl shadow-inner justify-center">
            <div className="flex items-center gap-2">
              <span className="w-3 h-2 rounded bg-[#2b1b24]/10 border border-[#2b1b24]/15" />
              <span className="text-[#6e5c66]">Harmony</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-2.5 rounded bg-[#ff5e6c] border border-[#ff5e6c]/40 shadow-[0_0_8px_rgba(255,94,108,0.2)]" />
              <span className="text-[#ff5e6c] font-royal">Lead Melody</span>
            </div>
          </div>
        </div>
      </div>

      {/* SVG Container with Custom Scrollbar */}
      <div className="w-full overflow-x-auto rounded-2xl bg-white/40 border border-[#2b1b24]/10 relative p-1 shadow-inner backdrop-blur-xl">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className={`w-full min-w-[700px] h-auto block select-none relative z-10 ${onSeek ? 'cursor-crosshair' : ''}`}
          onClick={(e) => {
            if (!onSeek) return;
            const svg = e.currentTarget;
            const rect = svg.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const svgWidth = rect.width;
            // Map click position to time
            const ratio = clickX / svgWidth;
            const usableRatio = Math.max(0, Math.min(1, (ratio * width - paddingX) / (width - paddingX * 2)));
            const seekTime = minTime + usableRatio * (maxTime - minTime);
            onSeek(Math.max(0, seekTime));
          }}
        >
          <defs>
            {/* Coral Pink & Sleuthe Yellow illustration style Gradient */}
            <linearGradient id="coral-yellow-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff5e6c" />
              <stop offset="100%" stopColor="#feb300" />
            </linearGradient>
          </defs>

          {/* Standard Pitch Horizontal Guides */}
          {Array(8).fill(0).map((_, i) => {
            const y = paddingY + (i / 7) * (height - paddingY * 2);
            return (
              <line
                key={i}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="rgba(43,27,36,0.08)"
                strokeWidth={1}
              />
            );
          })}

          {/* Render Harmony Tracks (Muted background notes) */}
          {harmonyNotesElements}

          {/* Render Selected Lead Track Note Blocks */}
          {melodyNotesElements}

          {/* Real-time Playback Head */}
          {isPlaying && (
            <g>
              {/* Playhead line glow */}
              <line
                x1={getCoords(playbackTime, minPitch, 0).x}
                y1={paddingY}
                x2={getCoords(playbackTime, minPitch, 0).x}
                y2={height - paddingY}
                stroke="#ff5e6c"
                strokeWidth={2}
                opacity={0.9}
                className="drop-shadow-[0_0_8px_rgba(255,94,108,0.7)]"
              />
              {/* Top and bottom terminal nodes */}
              <circle
                cx={getCoords(playbackTime, minPitch, 0).x}
                cy={paddingY}
                r={3}
                fill="#ff5e6c"
                className="animate-ping"
              />
              <circle
                cx={getCoords(playbackTime, minPitch, 0).x}
                cy={height - paddingY}
                r={3}
                fill="#ff5e6c"
                className="animate-ping"
              />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
