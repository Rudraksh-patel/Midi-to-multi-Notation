import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Music, ArrowRight, Star, Trash2 } from "lucide-react";
import gsap from "gsap";
import FileUpload from "./FileUpload";

export default function ViolinHero({ 
  onMidiParsed, 
  onXmlParsed, 
  onLoadDemo, 
  starredFiles = [], 
  onLoadStarredFile, 
  onDeleteStarredFile
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  // Refs for violin strings for GSAP manipulation
  const stringRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const stringXCoords = [112, 118, 124, 130]; // X positions of strings in the 240px SVG width
  
  // Trigger string vibration using GSAP
  const vibrateString = (index) => {
    const stringEl = stringRefs[index].current;
    if (!stringEl) return;

    const originalX = stringXCoords[index];
    const tl = gsap.timeline();

    // High speed vibrating back and forth with decaying amplitude
    tl.to(stringEl, { duration: 0.05, attr: { d: `M${originalX},80 Q${originalX + 8},240 ${originalX},400` }, ease: "sine.inOut" })
      .to(stringEl, { duration: 0.05, attr: { d: `M${originalX},80 Q${originalX - 6},240 ${originalX},400` }, ease: "sine.inOut" })
      .to(stringEl, { duration: 0.06, attr: { d: `M${originalX},80 Q${originalX + 4},240 ${originalX},400` }, ease: "sine.inOut" })
      .to(stringEl, { duration: 0.06, attr: { d: `M${originalX},80 Q${originalX - 3},240 ${originalX},400` }, ease: "sine.inOut" })
      .to(stringEl, { duration: 0.07, attr: { d: `M${originalX},80 Q${originalX + 1.5},240 ${originalX},400` }, ease: "sine.inOut" })
      .to(stringEl, { duration: 0.08, attr: { d: `M${originalX},80 Q${originalX},240 ${originalX},400` }, ease: "sine.inOut" });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    // Particle definitions
    // Modeled to represent Coral Pink MIDI blocks transforming to elegant Sleuthe Yellow/Charcoal notes
    class Particle {
      constructor() {
        this.x = 0;
        this.y = Math.random() * (height - 100) + 50;
        this.speedX = Math.random() * 2 + 1.5;
        this.speedY = 0;
        this.size = Math.random() * 10 + 12;
        this.alpha = 1;
        this.isTransformed = false;
        this.noteValue = ["A", "B", "C#", "D", "E", "F#", "G"][Math.floor(Math.random() * 7)];
        this.color = "rgba(255, 94, 108, 0.85)"; // Coral Pink raw MIDI blocks
        this.angle = 0;
        this.spin = Math.random() * 0.04 - 0.02;
      }

      update(violinScreenX) {
        this.x += this.speedX;
        this.y += this.speedY;

        // When it reaches the violin string x-axis line
        if (!this.isTransformed && this.x >= violinScreenX) {
          this.isTransformed = true;
          // Trigger a random string vibration
          const randomString = Math.floor(Math.random() * 4);
          vibrateString(randomString);

          // Morph particle state: float up, turn gold/yellow, drift like smoke
          this.speedY = -(Math.random() * 1.5 + 1);
          this.speedX = Math.random() * 1.5 + 1.5;
          this.color = "rgba(43, 27, 36, 0.95)"; // Deep Charcoal Plum notes
        }

        if (this.isTransformed) {
          this.alpha -= 0.008; // Fade out gradually
          this.angle += this.spin;
        }
      }

      draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        
        if (!this.isTransformed) {
          // Draw raw MIDI block (techno rectangle)
          ctx.shadowBlur = 12;
          ctx.shadowColor = "rgba(255, 94, 108, 0.4)";
          ctx.fillStyle = this.color;
          // Draw horizontal rounded rect
          const rectW = 28;
          const rectH = 10;
          ctx.beginPath();
          ctx.roundRect(this.x - rectW/2, this.y - rectH/2, rectW, rectH, 3);
          ctx.fill();
        } else {
          // Draw transformed elegant note letter
          ctx.shadowBlur = 15;
          ctx.shadowColor = "rgba(254, 179, 0, 0.3)";
          ctx.fillStyle = this.color;
          
          ctx.translate(this.x, this.y);
          ctx.rotate(this.angle);
          
          ctx.font = "italic bold 18px 'Fraunces', serif";
          ctx.fillText(this.noteValue, 0, 0);
        }
        ctx.restore();
      }
    }

    let particles = [];
    let spawnTimer = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // We align the interaction coordinates to the actual violin DOM position
      const violinRect = document.getElementById("hero-violin-svg")?.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      
      let violinScreenX = width / 2;
      if (violinRect && canvasRect) {
        violinScreenX = violinRect.left - canvasRect.left + violinRect.width / 2;
      }

      // Spawning frequency control
      spawnTimer++;
      if (spawnTimer > 35 && particles.length < 40) {
        particles.push(new Particle());
        spawnTimer = 0;
      }

      particles.forEach((p, index) => {
        p.update(violinScreenX);
        p.draw();

        // Remove dead/offscreen particles
        if (p.alpha <= 0 || p.x > width) {
          particles.splice(index, 1);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full max-w-5xl mx-auto flex flex-col items-center mt-4 relative">
      
      {/* Narrative Canvas particle overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-[400px] pointer-events-none z-10"
      />

      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-20">
        
        {/* Left Side: Copywriting & Value Prop */}
        <div className="lg:col-span-7 text-left space-y-6 px-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#ff5e6c]/20 bg-[#ff5e6c]/5 text-[#ff5e6c] text-xs font-bold uppercase tracking-widest shadow-sm">
            <Sparkles size={13} className="animate-pulse text-[#ff5e6c]" />
            The Digital Virtuoso
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#2b1b24] leading-tight font-royal tracking-tight">
            Play it by <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff5e6c] via-[#feb300] to-[#ff5e6c]">
              Letter.
            </span>
          </h1>

          <p className="text-base text-[#6e5c66] font-manuscript leading-relaxed max-w-xl italic">
            Convert digital music sheets (.mid, .xml) into readable, sharp-only Western letter notes or traditional Indian Sargam. Watch digital codes transform into readable virtuoso notations instantly.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase text-[#6e5c66]/80">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#ff5e6c]" /> Skyline Isolation</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#ff5e6c]" /> Scale Transposing</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#ff5e6c]" /> Interactive Playback</span>
          </div>

          <div className="pt-2">
            <a 
              href="#uploader-section"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#ff5e6c] hover:text-[#ff5e6c]/80 transition group"
            >
              Scroll to Convert <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>

        {/* Right Side: Flat Vector styled Violin SVG */}
        <div className="lg:col-span-5 flex justify-center relative">
          <div className="relative p-8 bg-white/40 backdrop-blur-xl border border-white/20 rounded-3xl shadow-[0_12px_40px_rgba(43,27,36,0.06)] overflow-hidden group">
            
            {/* Soft pink backing highlight */}
            <div className="absolute -inset-10 bg-[#ffaaab]/10 rounded-full blur-3xl pointer-events-none group-hover:bg-[#ffaaab]/20 transition-colors duration-700" />
            
            {/* Elegant SVG Violin illustration */}
            <svg
              id="hero-violin-svg"
              width="240"
              height="480"
              viewBox="0 0 240 480"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="relative z-10 filter drop-shadow-[0_8px_16px_rgba(43,27,36,0.08)]"
            >
              {/* Wooden neck/scroll body outline backplane */}
              <path d="M100,50 L140,50 L135,100 L105,100 Z" fill="#2b1b24" />
              <rect x="110" y="80" width="20" height="150" fill="#2b1b24" rx="2" /> {/* Fingerboard */}
              
              {/* Main C-Bouts Body outline */}
              <path
                d="M120,200 C80,200 65,220 65,250 C65,280 85,290 80,310 C70,330 55,340 55,370 C55,420 85,445 120,445 C155,445 185,420 185,370 C185,340 170,330 160,310 C155,290 175,280 175,250 C175,220 160,200 120,200 Z"
                fill="url(#violinFlatGrad)"
                stroke="#2b1b24"
                strokeWidth="3"
              />

              {/* F-Holes left and right */}
              <path d="M85,280 C82,300 90,320 87,340 C85,350 82,345 80,340 C83,320 75,300 78,280 Z" fill="#2b1b24" />
              <path d="M155,280 C158,300 150,320 153,340 C155,350 158,345 160,340 C157,320 165,300 162,280 Z" fill="#2b1b24" />

              {/* Golden Bridge & Tailpiece */}
              <rect x="100" y="342" width="40" height="6" fill="#2b1b24" rx="1" /> {/* Bridge */}
              <path d="M110,380 L130,380 L125,440 L115,440 Z" fill="#2b1b24" /> {/* Tailpiece */}
              
              {/* String Paths */}
              <path ref={stringRefs[0]} d="M112,80 Q112,240 112,400" stroke="#ff5e6c" strokeWidth="1.5" />
              <path ref={stringRefs[1]} d="M118,80 Q118,240 118,400" stroke="#feb300" strokeWidth="1.8" />
              <path ref={stringRefs[2]} d="M124,80 Q124,240 124,400" stroke="#ffaaab" strokeWidth="1.5" />
              <path ref={stringRefs[3]} d="M130,80 Q130,240 130,400" stroke="#2b1b24" strokeWidth="1.2" />

              {/* Wide transparent hover triggers for plucking strings */}
              <rect x="108" y="80" width="8" height="320" fill="transparent" className="cursor-pointer" onMouseEnter={() => vibrateString(0)} />
              <rect x="115" y="80" width="8" height="320" fill="transparent" className="cursor-pointer" onMouseEnter={() => vibrateString(1)} />
              <rect x="121" y="80" width="8" height="320" fill="transparent" className="cursor-pointer" onMouseEnter={() => vibrateString(2)} />
              <rect x="127" y="80" width="8" height="320" fill="transparent" className="cursor-pointer" onMouseEnter={() => vibrateString(3)} />

              {/* Definitions for rich editorial flat gradients */}
              <defs>
                <linearGradient id="violinFlatGrad" x1="120" y1="200" x2="120" y2="445" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#feb300" /> {/* Sleuthe Yellow */}
                  <stop offset="60%" stopColor="#ffaaab" /> {/* Pink Leaf */}
                  <stop offset="100%" stopColor="#ff5e6c" /> {/* Coral Pink */}
                </linearGradient>
              </defs>
            </svg>
            
            <div className="absolute bottom-4 left-0 right-0 text-center select-none pointer-events-none">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#2b1b24]/50 animate-pulse font-royal">Hover Strings to Pluck</span>
            </div>
          </div>
        </div>

      </div>

      {/* Velvet Case File Upload Section (Centered) */}
      <section id="uploader-section" className="w-full mt-16 max-w-2xl mx-auto scroll-mt-6 px-4">
        {/* Card 1: Standard MIDI / XML Upload */}
        <div className="bg-white/40 backdrop-blur-xl border border-white/20 p-6 rounded-3xl shadow-[0_12px_40px_rgba(43,27,36,0.06)] flex flex-col justify-between text-left">
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-[#2b1b24] tracking-wide font-royal uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff5e6c]" />
              Digital File Studio
            </h3>
            <p className="text-xs text-[#6e5c66] font-manuscript leading-relaxed italic">
              Upload standard .mid or .musicxml sheet files to immediately isolate and transpose the melody with automated keys and tempos.
            </p>
            <FileUpload onMidiParsed={onMidiParsed} onXmlParsed={onXmlParsed} />
          </div>
        </div>
      </section>

      {/* Starred Repertoire Local Shelf */}
      {starredFiles && starredFiles.length > 0 && (
        <section className="w-full mt-8 max-w-4xl text-center space-y-6">
          <div className="flex items-center justify-center gap-2">
            <div className="h-[1px] w-12 bg-[#feb300]/20" />
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-[#feb300] font-royal flex items-center gap-1.5">
              <Star size={15} fill="#feb300" /> Your Starred Repertoire
            </h3>
            <div className="h-[1px] w-12 bg-[#feb300]/20" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {starredFiles.map((item) => (
              <div
                key={item.name}
                className="relative group border border-[#feb300]/25 bg-white/40 hover:bg-white/70 hover:border-[#feb300]/60 p-6 rounded-2xl flex flex-col justify-between gap-4 transition-all duration-300 shadow-md overflow-hidden text-left"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#feb300]/5 rounded-full blur-xl pointer-events-none" />
                
                <div className="space-y-1">
                  <div className="text-[9px] font-extrabold uppercase tracking-wider text-[#feb300] font-royal flex items-center gap-1">
                    {item.type === "midi" ? "🎻 MIDI SCORE" : "🪈 MusicXML SHEET"}
                  </div>
                  <h4 className="text-sm font-bold text-[#2b1b24] truncate pr-6 font-royal" title={item.name}>
                    {item.name}
                  </h4>
                  <p className="text-[10px] text-[#6e5c66] font-manuscript italic">
                    Starred on: {new Date(item.starredAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => onLoadStarredFile(item)}
                    className="flex-1 bg-white hover:bg-[#fffcf4] border border-[#2b1b24]/10 text-[#2b1b24] hover:text-[#ff5e6c] text-[10px] font-extrabold uppercase tracking-wider py-2.5 rounded-xl transition cursor-pointer select-none active:scale-95 outline-none shadow-sm text-center"
                  >
                    Load Score
                  </button>
                  <button
                    onClick={() => onDeleteStarredFile(item.name)}
                    className="p-2.5 rounded-xl border border-transparent hover:border-red-200 text-slate-400 hover:text-red-500 hover:bg-red-50/50 transition cursor-pointer"
                    title="Un-star File"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Classical Repertoire Traditional Scrolls */}
      <section className="w-full mt-8 max-w-4xl text-center space-y-6 mb-12">
        <div className="flex items-center justify-center gap-2">
          <div className="h-[1px] w-12 bg-[#2b1b24]/10" />
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-[#ff5e6c] font-royal">
            Classical & Traditional Repertoire
          </h3>
          <div className="h-[1px] w-12 bg-[#2b1b24]/10" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <button
            onClick={() => onLoadDemo("yaman")}
            className="p-6 rounded-2xl border border-white/20 bg-white/40 hover:bg-white/70 hover:border-[#ff5e6c]/40 text-left transition-all duration-300 group cursor-pointer active:scale-[0.98] shadow-md relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#ffaaab]/10 rounded-full blur-xl pointer-events-none" />
            <div className="text-[10px] font-black uppercase tracking-widest text-[#ff5e6c] font-royal mb-1">
              Evening Yaman
            </div>
            <div className="text-sm font-bold text-[#2b1b24] group-hover:text-[#ff5e6c] transition mb-2">
              🪈 Raga Yaman
            </div>
            <p className="text-[11px] text-[#6e5c66] leading-normal font-manuscript italic">
              Serene Hindustani evening melody featuring Tivra Ma (sharp 4th).
            </p>
          </button>

          <button
            onClick={() => onLoadDemo("bhairavi")}
            className="p-6 rounded-2xl border border-white/20 bg-white/40 hover:bg-white/70 hover:border-[#ff5e6c]/40 text-left transition-all duration-300 group cursor-pointer active:scale-[0.98] shadow-md relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#ffaaab]/10 rounded-full blur-xl pointer-events-none" />
            <div className="text-[10px] font-black uppercase tracking-widest text-[#ff5e6c] font-royal mb-1">
              Morning Bhairavi
            </div>
            <div className="text-sm font-bold text-[#2b1b24] group-hover:text-[#ff5e6c] transition mb-2">
              🪈 Raga Bhairavi
            </div>
            <p className="text-[11px] text-[#6e5c66] leading-normal font-manuscript italic">
              Devotional morning melody featuring Komal (flat) Re, Ga, Dha, and Ni.
            </p>
          </button>

          <button
            onClick={() => onLoadDemo("twinkle")}
            className="p-6 rounded-2xl border border-white/20 bg-white/40 hover:bg-white/70 hover:border-[#ff5e6c]/40 text-left transition-all duration-300 group cursor-pointer active:scale-[0.98] shadow-md relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#ffaaab]/10 rounded-full blur-xl pointer-events-none" />
            <div className="text-[10px] font-black uppercase tracking-widest text-[#ff5e6c] font-royal mb-1">
              Western Folk
            </div>
            <div className="text-sm font-bold text-[#2b1b24] group-hover:text-[#ff5e6c] transition mb-2">
              🎻 Twinkle Twinkle
            </div>
            <p className="text-[11px] text-[#6e5c66] leading-normal font-manuscript italic">
              Traditional folk song, ideal for validating note grids and transpositions.
            </p>
          </button>
        </div>
      </section>

    </div>
  );
}
