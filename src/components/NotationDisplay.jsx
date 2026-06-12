import React, { useState, useEffect, useMemo, useRef } from "react";
import { Copy, Check, Download, Play, Square, Settings2, Sparkles, Volume2, Printer, FileText, Star } from "lucide-react";
import { midiToSargam, groupNotesIntoPhrases } from "../utils/notationEngines";

export default function NotationDisplay({
  notationText = "",
  isPlaying = false,
  onPlayToggle,
  onStop,
  stepDuration = 0.25,
  onChangeStepDuration,
  phraseBreakGap = 1.0,
  onChangePhraseBreakGap,
  synthType = "piano",
  onChangeSynthType,
  defaultFileName,
  detectedKeyName,
  printFont,
  setPrintFont,
  printMargin,
  setPrintMargin,
  printPadding,
  setPrintPadding,
  showPrintHeader,
  setShowPrintHeader,
  skylineNotes = [],
  playbackTime = 0,
  notationType = "western",
  transpositionShift = 0,
  saRootIndex = 2,
  bpm = 120,
  onChangeBpm,
  detectedBpm = 120,
  analyserNode,
  isStarred = false,
  onToggleStar
}) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState("interactive"); // "interactive" | "plain"
  const [showSidebar, setShowSidebar] = useState(true);

  const activeElRef = useRef(null);
  const isHoveredRef = useRef(false);
  const waveformCanvasRef = useRef(null);

  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    const draw = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, width, height);

      let values = new Float32Array(256);
      if (analyserNode && isPlaying) {
        try {
          values = analyserNode.getValue();
        } catch (e) {
          // fallback
        }
      }

      const time = Date.now() * 0.004;

      // 1. Draw filled gradient wave ribbon
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      for (let i = 0; i < width; i++) {
        const valIndex = Math.floor((i / width) * 256);
        let val = values[valIndex];
        if (typeof val !== 'number' || isNaN(val)) val = 0;

        const amp = isPlaying ? val * (height * 0.45) : 0;
        const idle = Math.sin(i * 0.035 + time) * 3.5;
        const y = height / 2 + amp + idle;
        if (i === 0) ctx.moveTo(i, y);
        else ctx.lineTo(i, y);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, 0, width, 0);
      grad.addColorStop(0, "rgba(255, 94, 108, 0.18)"); // Coral Pink
      grad.addColorStop(0.5, "rgba(254, 179, 0, 0.12)"); // Sleuthe Yellow
      grad.addColorStop(1, "rgba(255, 94, 108, 0.18)");
      ctx.fillStyle = grad;
      ctx.fill();

      // 2. Draw top wave outline
      ctx.beginPath();
      for (let i = 0; i < width; i++) {
        const valIndex = Math.floor((i / width) * 256);
        let val = values[valIndex];
        if (typeof val !== 'number' || isNaN(val)) val = 0;

        const amp = isPlaying ? val * (height * 0.45) : 0;
        const idle = Math.sin(i * 0.035 + time) * 3.5;
        const y = height / 2 + amp + idle;
        if (i === 0) ctx.moveTo(i, y);
        else ctx.lineTo(i, y);
      }
      ctx.strokeStyle = "rgba(255, 94, 108, 0.6)";
      ctx.lineWidth = 1.8;
      ctx.stroke();

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, [analyserNode, isPlaying]);


  // Advanced smooth-gliding highlighter & auto-scroller
  useEffect(() => {
    const containerEl = document.getElementById("interactive-container");
    const highlighterEl = document.getElementById("note-highlighter");
    const highlighterProgressEl = document.getElementById("note-highlighter-progress");
    
    if (!containerEl || !highlighterEl) return;
    
    if (!isPlaying) {
      highlighterEl.style.opacity = "0";
      if (highlighterProgressEl) {
        highlighterProgressEl.style.width = "0%";
      }
      activeElRef.current = null;
      return;
    }
    
    const activeEl = containerEl.querySelector(".note-block-active");
    if (activeEl) {
      if (activeElRef.current !== activeEl) {
        activeElRef.current = activeEl;
        

        
        // 2. Position the highlighter block relative to the scroll container
        const activeRect = activeEl.getBoundingClientRect();
        const containerRect = containerEl.getBoundingClientRect();
        
        const top = activeRect.top - containerRect.top + containerEl.scrollTop;
        const left = activeRect.left - containerRect.left + containerEl.scrollLeft;
        const width = activeRect.width;
        const height = activeRect.height;
        
        highlighterEl.style.top = `${top}px`;
        highlighterEl.style.left = `${left}px`;
        highlighterEl.style.width = `${width}px`;
        highlighterEl.style.height = `${height}px`;
        highlighterEl.style.opacity = "1";
      }
      
      // 3. Dynamically update the smooth progress glide bar inside the moving block
      const noteTime = Number(activeEl.getAttribute("data-time") || 0);
      const noteDuration = Number(activeEl.getAttribute("data-duration") || 0);
      if (noteDuration > 0) {
        const progress = Math.max(0, Math.min(100, ((playbackTime - noteTime) / noteDuration) * 100));
        if (highlighterProgressEl) {
          highlighterProgressEl.style.width = `${progress}%`;
        }
      }
    } else {
      highlighterEl.style.opacity = "0";
    }
  }, [playbackTime, isPlaying]);

  // Group notes into lines/phrases based on phraseBreakGap and stepDuration
  const visualPhrases = useMemo(() => {
    return groupNotesIntoPhrases(skylineNotes, { phraseBreakGap, stepDuration });
  }, [skylineNotes, phraseBreakGap, stepDuration]);

  const bowProgress = useMemo(() => {
    if (skylineNotes.length === 0) return 0;
    const finalNote = skylineNotes[skylineNotes.length - 1];
    const totalDuration = finalNote ? finalNote.time + finalNote.duration : 1;
    return Math.max(0, Math.min(100, (playbackTime / totalDuration) * 100));
  }, [skylineNotes, playbackTime]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(notationText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  };

  const handleDownload = () => {
    const baseName = defaultFileName ? defaultFileName.replace(/\.midi?$/i, "") : "midi-letter-notes";
    const defaultName = `${baseName}_notation.txt`;
    const userFileName = window.prompt("Enter filename to save:", defaultName);
    
    // User cancelled the prompt
    if (userFileName === null) return;
    
    let finalFileName = userFileName.trim();
    // If the user cleared the text or input spaces, fallback to the defaultName
    if (!finalFileName) {
      finalFileName = defaultName;
    }
    
    // Automatically append .txt if absent
    if (!finalFileName.toLowerCase().endsWith(".txt")) {
      finalFileName += ".txt";
    }

    const element = document.createElement("a");
    const file = new Blob([notationText], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = finalFileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className={`w-full max-w-none mb-16 bg-white/40 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden shadow-[0_12px_40px_rgba(43,27,36,0.06)] relative border-beam-container ${isPlaying ? 'border-beam-active' : ''}`}>
      
      {/* Dynamic card decoration glow */}
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[#ffaaab]/10 blur-3xl pointer-events-none" />

      {/* Header and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-b border-[#2b1b24]/10 bg-white/30 relative z-10">
        <div className="flex flex-col gap-1.5 text-left">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#ff5e6c]/10 border border-[#ff5e6c]/25 text-[#ff5e6c]">
              <Sparkles size={16} className="animate-spin" style={{ animationDuration: '8s' }} />
            </div>
            <h2 className="text-lg font-extrabold text-[#2b1b24] tracking-wide font-royal">Generated Notation Sheet</h2>
            
            {/* Star Toggle Button */}
            <button
              onClick={onToggleStar}
              className={`p-1.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                isStarred 
                  ? "bg-[#feb300]/10 border-[#feb300]/40 text-[#feb300] shadow-sm scale-95" 
                  : "bg-white/40 border-[#2b1b24]/10 text-[#6e5c66] hover:text-[#2b1b24] hover:border-[#2b1b24]/30"
              }`}
              title={isStarred ? "Remove from Starred Repertoire" : "Star this File"}
            >
              <Star size={16} fill={isStarred ? "#feb300" : "none"} className={isStarred ? "animate-pulse" : ""} />
            </button>
          </div>
          {defaultFileName && (
            <p className="text-[11px] text-[#6e5c66] font-manuscript italic pl-9">
              File: <span className="text-[#2b1b24] font-semibold font-mono not-italic">{defaultFileName}</span>
            </p>
          )}
        </div>
        
        {/* Playback Controls & File Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Tone.js Playback Buttons */}
          <div className="flex items-center bg-white/50 border border-[#2b1b24]/15 rounded-2xl p-1 shadow-inner">
            <button
              onClick={onPlayToggle}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider transition-all duration-300 cursor-pointer select-none border border-transparent ${
                isPlaying
                  ? "bg-[#ff5e6c] border-[#ff5e6c]/20 text-white shadow-[0_4px_12px_rgba(255,94,108,0.25)] scale-95"
                  : "text-[#6e5c66] hover:text-[#2b1b24] hover:bg-white/50"
              }`}
              title={isPlaying ? "Pause Playback" : "Synthesize Melody"}
            >
              <Play size={14} fill={isPlaying ? "white" : "none"} className={isPlaying ? "animate-pulse" : ""} />
              {isPlaying ? "Playing" : "Play Synth"}
            </button>
            
            {isPlaying && (
              <button
                onClick={onStop}
                className="p-2 ml-1 rounded-xl text-[#6e5c66] hover:text-red-500 transition-all duration-300 cursor-pointer active:scale-90"
                title="Stop Playback"
              >
                <Square size={14} fill="currentColor" />
              </button>
            )}
          </div>

          {/* Toggle Sidebar Button */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl border transition-all duration-300 cursor-pointer bg-white/20 text-xs font-extrabold uppercase ${
              showSidebar 
                ? "bg-[#ff5e6c]/10 border-[#ff5e6c]/30 text-[#ff5e6c] hover:bg-[#ff5e6c]/15" 
                : "border-[#2b1b24]/15 text-[#6e5c66] hover:text-[#2b1b24] hover:bg-white/50"
            }`}
            title={showSidebar ? "Hide Fine-Tune Settings" : "Show Fine-Tune Settings"}
          >
            <Settings2 size={14} className={showSidebar ? "animate-spin" : ""} style={{ animationDuration: showSidebar ? '15s' : '0s', animationIterationCount: 'infinite' }} />
            {showSidebar ? "Hide Settings" : "Configure"}
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl border border-[#2b1b24]/15 text-xs font-extrabold uppercase text-[#6e5c66] hover:text-[#2b1b24] hover:bg-white/50 transition-all duration-300 cursor-pointer bg-white/20"
          >
            {copied ? (
              <>
                <Check size={14} className="text-[#ff5e6c]" />
                Copied
              </>
            ) : (
              <>
                <Copy size={14} />
                Copy
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-white/50 hover:bg-white/75 border border-[#2b1b24]/15 text-xs font-extrabold uppercase text-[#2b1b24] transition-all duration-300 cursor-pointer"
          >
            <Download size={14} />
            Download
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-[#ff5e6c] hover:bg-[#ff5e6c]/90 border border-[#ff5e6c]/30 text-xs font-extrabold uppercase text-white transition-all duration-300 cursor-pointer btn-premium shadow-md shadow-[#ff5e6c]/15"
          >
            <Printer size={14} />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Main Display Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 relative z-10">
        
        {/* Left 2 Columns: Large Monospaced Notation Output */}
        <div className={`${showSidebar ? 'lg:col-span-2 border-r border-[#2b1b24]/10' : 'lg:col-span-3'} p-6 flex flex-col gap-5 bg-white/10 transition-all duration-300`}>
          <div className="flex items-center justify-between border-b border-[#2b1b24]/5 pb-3.5">
            <span className="text-xs font-extrabold text-[#6e5c66] uppercase tracking-widest flex items-center gap-1.5 font-royal">
              🎭 Score Presentation Mode
            </span>
            <div className="flex bg-white/50 border border-[#2b1b24]/10 p-1 rounded-2xl no-print shadow-inner">
              <button
                onClick={() => setViewMode("interactive")}
                className={`px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all duration-300 cursor-pointer select-none ${
                  viewMode === "interactive"
                    ? "bg-[#ff5e6c] text-white shadow-[0_4px_12px_rgba(255,94,108,0.2)]"
                    : "text-[#6e5c66] hover:text-[#2b1b24]"
                }`}
              >
                🎮 Interactive Flow
              </button>
              <button
                onClick={() => setViewMode("plain")}
                className={`px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all duration-300 cursor-pointer select-none ${
                  viewMode === "plain"
                    ? "bg-[#ff5e6c] text-white shadow-[0_4px_12px_rgba(255,94,108,0.2)]"
                    : "text-[#6e5c66] hover:text-[#2b1b24]"
                }`}
              >
                📜 Plain Manuscript
              </button>
            </div>
          </div>

          {isPlaying && (
            <div className="w-full bg-white/50 p-4 border border-[#2b1b24]/10 rounded-2xl flex flex-col gap-2.5 animate-fadeIn no-print shadow-inner">
              <div className="flex justify-between items-center text-[10px] uppercase font-extrabold text-[#ff5e6c] tracking-wider font-royal">
                <span>🎻 Bow Position (Active Playback)</span>
                <span>{Math.round(bowProgress)}% Played</span>
              </div>
              <div className="relative w-full h-8 flex items-center bg-white border border-[#2b1b24]/10 rounded-lg px-4 overflow-hidden">
                {/* Responsive fluid waveform ribbon backdrop */}
                <canvas 
                  ref={waveformCanvasRef} 
                  className="absolute inset-0 w-full h-full pointer-events-none opacity-70" 
                />
                {/* The String (hairline) */}
                <div className="w-full h-[1.5px] bg-[#feb300]/40 absolute left-0 right-0 z-10" />
                {/* The Bow */}
                <svg 
                  width="80" 
                  height="12" 
                  viewBox="0 0 80 12" 
                  className="absolute top-1/2 -translate-y-1/2 transition-all duration-100 ease-out z-10"
                  style={{ left: `calc(${bowProgress}% - 40px)` }}
                >
                  {/* Stick of the bow (wood brown) */}
                  <rect x="0" y="2" width="80" height="2" fill="#ff5e6c" rx="1" />
                  {/* Frog of the bow (black leather) */}
                  <rect x="0" y="2" width="10" height="6" fill="#2b1b24" rx="1" />
                  {/* Tip of the bow (white ivory) */}
                  <path d="M75,2 L80,2 L78,8 Z" fill="#ffaaab" />
                  {/* Hair of the bow (golden/white line) */}
                  <line x1="8" y1="6" x2="76" y2="6" stroke="#2b1b24" strokeWidth="1" />
                </svg>
              </div>
            </div>
          )}

          {notationText ? (
            viewMode === "interactive" && skylineNotes.length > 0 ? (
              <div 
                id="interactive-container"
                onMouseEnter={() => { isHoveredRef.current = true; }}
                onMouseLeave={() => { isHoveredRef.current = false; }}
                className="relative w-full flex-1 h-[680px] overflow-y-auto rounded-3xl bg-white/70 p-6 border border-[#2b1b24]/10 shadow-inner space-y-6 scroll-smooth"
              >
                {/* Smooth-gliding moving block highlighter */}
                <div 
                  id="note-highlighter" 
                  className="absolute pointer-events-none opacity-0 border border-[#ff5e6c] bg-[#ffaaab]/10 rounded-2xl shadow-[0_0_20px_rgba(255,94,108,0.25)] flex flex-col justify-end overflow-hidden z-0"
                  style={{
                    transitionProperty: "left, top, width, height, opacity",
                    transitionDuration: "250ms",
                    transitionTimingFunction: "cubic-bezier(0.25, 1, 0.5, 1)"
                  }}
                >
                  {/* Smooth glide progress bar inside the active gliding block */}
                  <div 
                    id="note-highlighter-progress" 
                    className="h-1 bg-[#ff5e6c] w-0"
                    style={{
                      transition: "width 80ms linear"
                    }}
                  />
                </div>

                {visualPhrases.map((phrase, phraseIdx) => (
                  <div key={phraseIdx} className="flex flex-wrap items-center gap-y-4 gap-x-2.5 pb-5 border-b border-[#2b1b24]/5 last:border-b-0 last:pb-0 relative z-10">
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#6e5c66]/60 mr-2.5 select-none z-10 relative">
                      Line {phraseIdx + 1}
                    </div>
                    
                    {phrase.map((note, noteIdx) => {
                      const isActive = isPlaying && playbackTime >= note.time && playbackTime < (note.time + note.duration);
                      
                      // Format note name
                      let noteName = "";
                      if (notationType === "western") {
                        const finalPitch = note.pitch + transpositionShift;
                        noteName = `${["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][finalPitch % 12]}${Math.floor(finalPitch / 12) - 1}`;
                      } else {
                        noteName = midiToSargam(note.pitch + transpositionShift, saRootIndex, 4);
                      }
                      
                      const steps = Math.max(1, Math.round(note.duration / stepDuration));
                      
                      return (
                        <div key={noteIdx} className="flex items-center gap-2 z-10 relative">
                          <div 
                            data-time={note.time}
                            data-duration={note.duration}
                            className={`relative px-4 py-3 rounded-2xl border text-sm font-mono font-extrabold tracking-wide transition-all duration-300 min-w-[54px] text-center select-none z-10 ${
                              isActive
                                ? "note-block-active border-transparent text-[#ff5e6c] font-black scale-105 shadow-[0_0_15px_rgba(255,94,108,0.2)]"
                                : "bg-white border border-[#2b1b24]/10 text-[#2b1b24] hover:border-[#ff5e6c]/30 hover:scale-95"
                            }`}
                          >
                            {noteName}
                          </div>
                          
                          {/* Connecting visual sustain dashes */}
                          {steps > 1 && (
                            <div className="flex gap-1.5 z-10 relative">
                              {Array(steps - 1).fill("-").map((_, dIdx) => (
                                <div 
                                  key={dIdx} 
                                  className={`w-5.5 h-5.5 flex items-center justify-center font-mono text-sm select-none transition-colors duration-300 ${
                                    isActive ? "text-[#ff5e6c] font-black" : "text-[#2b1b24]/30"
                                  }`}
                                >
                                  -
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <pre className="w-full flex-1 h-[680px] overflow-y-auto rounded-3xl bg-white/70 p-6 text-[#2b1b24] font-mono text-sm leading-relaxed tracking-wider break-words border border-[#2b1b24]/10 shadow-inner focus:outline-none selection:bg-[#ff5e6c]/20 selection:text-[#2b1b24] whitespace-pre-wrap">
                {notationText}
              </pre>
            )
          ) : (
            <div className="w-full flex-1 h-[680px] rounded-3xl border-2 border-dashed border-[#2b1b24]/10 flex flex-col items-center justify-center text-center p-8 bg-white/30">
              <p className="text-sm font-semibold text-[#6e5c66] max-w-sm leading-relaxed font-manuscript italic">
                Upload a MIDI file and select a melody track to preview the sheet notation output.
              </p>
            </div>
          )}
        </div>

        {/* Right 1 Column: Fine Tuning Formatting & Playback Settings */}
        {showSidebar && (
          <div className="p-6 space-y-6 bg-white/30 animate-fadeIn">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#2b1b24] flex items-center gap-2 border-b border-[#2b1b24]/10 pb-3 font-royal">
            <Settings2 size={14} className="text-[#ff5e6c]" />
            Fine-Tune Notation Style
          </h3>

          {/* Synth Voice Selector */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#2b1b24] flex items-center gap-1.5 font-sans">
                <Volume2 size={12} className="text-[#ff5e6c]" />
                Synthesizer Voice
              </span>
            </div>
            <select
              value={synthType}
              onChange={(e) => onChangeSynthType(e.target.value)}
              className="w-full bg-white border border-[#2b1b24]/10 text-[#2b1b24] text-xs rounded-xl px-3 py-3 focus:border-[#ff5e6c]/60 outline-none transition-all duration-300 cursor-pointer shadow-inner font-semibold"
            >
              <option value="piano">Acoustic Grand Piano</option>
              <option value="sine">Pure Flute/Sine Wave</option>
              <option value="triangle">Soft Woodwind/Triangle</option>
              <option value="sawtooth">Synth Lead/Sawtooth</option>
            </select>
          </div>

          {/* BPM / Tempo Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#2b1b24] flex items-center gap-1.5 font-sans">
                ⏱️ Playback Tempo
              </span>
              <span className="font-mono text-[#ff5e6c] font-extrabold">{bpm} BPM</span>
            </div>
            <input
              type="range"
              min="20"
              max="300"
              step="1"
              value={bpm}
              onChange={(e) => onChangeBpm(Number(e.target.value))}
              className="w-full h-1.5 rounded-lg bg-white cursor-pointer transition-all outline-none"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-[#6e5c66] font-semibold leading-normal">
                Original MIDI tempo: <span className="text-[#ff5e6c] font-bold">{detectedBpm} BPM</span>
              </p>
              {bpm !== detectedBpm && (
                <button
                  onClick={() => onChangeBpm(detectedBpm)}
                  className="text-[9px] font-extrabold uppercase tracking-wider text-[#ff5e6c] hover:text-[#2b1b24] transition px-2.5 py-1 rounded-xl bg-[#ff5e6c]/10 border border-[#ff5e6c]/20 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Phrasing Gap Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#2b1b24] font-sans">Phrase Break Threshold</span>
              <span className="font-mono text-[#ff5e6c] font-extrabold">{phraseBreakGap}s</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.1"
              value={phraseBreakGap}
              onChange={(e) => onChangePhraseBreakGap(Number(e.target.value))}
              className="w-full h-1.5 rounded-lg bg-white cursor-pointer transition-all outline-none"
            />
            <p className="text-[10px] text-[#6e5c66] font-semibold leading-relaxed">
              Breaks text into a new line when a silence gap exceeds this duration.
            </p>
          </div>

          {/* Rhythmic Sustain Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#2b1b24] font-sans">Sustain Unit Size</span>
              <span className="font-mono text-[#ff5e6c] font-extrabold">{stepDuration}s</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.80"
              step="0.05"
              value={stepDuration}
              onChange={(e) => onChangeStepDuration(Number(e.target.value))}
              className="w-full h-1.5 rounded-lg bg-white cursor-pointer transition-all outline-none"
            />
            <p className="text-[10px] text-[#6e5c66] font-semibold leading-relaxed">
              Determines how many seconds represents a single beat/dash (`-`). Lower values generate more dashes.
            </p>
          </div>

          {/* PDF Print Sheet Layout Customizer */}
          <div className="space-y-4 pt-5 border-t border-[#2b1b24]/10">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#2b1b24] flex items-center gap-1.5 pb-1 font-royal">
              <FileText size={14} className="text-[#ff5e6c] animate-pulse" />
              Print & PDF Designer
            </h4>
            
            <div className="space-y-2">
              <label className="text-[9px] font-extrabold text-[#6e5c66] uppercase tracking-widest">Sheet Typography</label>
              <select
                value={printFont}
                onChange={(e) => setPrintFont(e.target.value)}
                className="w-full bg-white border border-[#2b1b24]/10 text-[#2b1b24] text-[11px] rounded-xl px-2.5 py-2.5 cursor-pointer focus:border-[#ff5e6c]/60 outline-none shadow-inner font-semibold"
              >
                <option value="mono">Clean Monospace (Fira Code)</option>
                <option value="serif">Elegant Serif (Georgia)</option>
                <option value="sans">Modern Sans-Serif (Outfit)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-extrabold text-[#6e5c66] uppercase tracking-widest">Sheet Margins</label>
              <select
                value={printMargin}
                onChange={(e) => setPrintMargin(e.target.value)}
                className="w-full bg-white border border-[#2b1b24]/10 text-[#2b1b24] text-[11px] rounded-xl px-2.5 py-2.5 cursor-pointer focus:border-[#ff5e6c]/60 outline-none shadow-inner font-semibold"
              >
                <option value="compact">Compact Margins</option>
                <option value="standard">Standard Margins</option>
                <option value="wide">Wide Spacious Margins</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-extrabold text-[#6e5c66] uppercase tracking-widest">Line Padding Heights</label>
              <select
                value={printPadding}
                onChange={(e) => setPrintPadding(e.target.value)}
                className="w-full bg-white border border-[#2b1b24]/10 text-[#2b1b24] text-[11px] rounded-xl px-2.5 py-2.5 cursor-pointer focus:border-[#ff5e6c]/60 outline-none shadow-inner font-semibold"
              >
                <option value="compact">Compact Spacing</option>
                <option value="regular">Standard Spacing</option>
                <option value="spacious">Spacious Double Spacing</option>
              </select>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none group mt-4">
              <input
                type="checkbox"
                checked={showPrintHeader}
                onChange={(e) => setShowPrintHeader(e.target.checked)}
                className="w-4 h-4 rounded border-[#2b1b24]/10 bg-white accent-[#ff5e6c] cursor-pointer shadow-inner"
              />
              <span className="text-[9px] font-extrabold text-[#6e5c66] group-hover:text-[#2b1b24] transition uppercase tracking-widest">
                Include Metadata Header
              </span>
            </label>
          </div>
        </div>
        )}
      </div>

      {/* Hidden print-only workspace targeted by window.print() */}
      <div 
        className={`print-only-target print-font-${printFont} print-margin-${printMargin} print-padding-${printPadding} hidden`}
      >
        {showPrintHeader && (
          <div className="mb-6 pb-4 border-b-2 border-slate-300" style={{ color: "#000000" }}>
            <h1 className="text-2xl font-bold tracking-tight text-black mb-1 font-royal">
              {defaultFileName ? defaultFileName.replace(/\.midi?$/i, "") : "MIDI Notation Score"}
            </h1>
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <span><b>Key:</b> {detectedKeyName || "C Major"}</span>
              <span><b>Scale Type:</b> Chromatic Letters</span>
              <span><b>Export Date:</b> {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
        )}
        
        <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed" style={{ color: "#000000" }}>
          {notationText}
        </pre>
      </div>
    </div>
  );
}
