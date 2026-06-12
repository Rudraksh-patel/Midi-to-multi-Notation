import React, { useState, useRef, useEffect } from "react";
import { Music, AlertCircle, FileCheck } from "lucide-react";
import { Midi } from "@tonejs/midi";
import gsap from "gsap";

function FileUpload({ onMidiParsed, onXmlParsed }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState("");
  
  const fileInputRef = useRef(null);
  const bowRef = useRef(null);

  useEffect(() => {
    if (loading && bowRef.current) {
      // Sweeping bow animation representing conversion progress
      gsap.to(bowRef.current, {
        x: "280px",
        duration: 1.2,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut"
      });
    }
  }, [loading]);

  const processFile = async (file) => {
    if (!file) return;
    
    // Validate file type
    const extension = file.name.split(".").pop().toLowerCase();
    if (!["mid", "midi", "xml", "musicxml"].includes(extension)) {
      setError("Please upload a valid MIDI file (.mid, .midi) or MusicXML sheet (.xml, .musicxml).");
      return;
    }

    setLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      const reader = new FileReader();
      
      if (extension === "xml" || extension === "musicxml") {
        reader.onload = (e) => {
          try {
            onXmlParsed({
              fileName: file.name,
              xmlData: e.target.result,
              rawFile: file
            });
          } catch (err) {
            setError("Failed to parse MusicXML: " + err.message);
          } finally {
            setLoading(false);
          }
        };
        reader.onerror = () => {
          setError("Error reading file.");
          setLoading(false);
        };
        reader.readAsText(file);
      } else {
        reader.onload = (e) => {
          try {
            const midi = new Midi(e.target.result);
            
            if (!midi.tracks || midi.tracks.length === 0) {
              throw new Error("No MIDI tracks found in the uploaded file.");
            }
            
            onMidiParsed({
              fileName: file.name,
              midiData: midi,
              rawFile: file
            });
          } catch (err) {
            setError(err.message || "Failed to parse MIDI file. It may be corrupted.");
          } finally {
            setLoading(false);
          }
        };
        
        reader.onerror = () => {
          setError("Error reading file.");
          setLoading(false);
        };
        
        reader.readAsArrayBuffer(file);
      }
    } catch (err) {
      setError("An unexpected error occurred during upload.");
      setLoading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-none mb-8">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer flex flex-col items-center justify-center border-2 rounded-3xl p-12 text-center transition-all duration-500 overflow-hidden bg-white/45 backdrop-blur-xl ${
          isDragActive
            ? "border-[#ff5e6c] shadow-[0_12px_40px_rgba(255,94,108,0.15)] bg-white/60 scale-[1.01]"
            : "border-[#2b1b24]/10 hover:border-[#ff5e6c]/50 hover:bg-white/65 hover:shadow-[0_12px_30px_rgba(255,94,108,0.06)]"
        }`}
        style={{
          borderStyle: "double",
          borderWidth: "3px"
        }}
      >
        {/* Soft Pink Leaf overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#ffaaab]/5 via-transparent to-[#ffaaab]/5 pointer-events-none" />
        
        {/* Ambient plush cushions */}
        <div className="absolute -top-24 -left-24 w-60 h-60 rounded-full bg-[#ffaaab]/10 blur-3xl group-hover:bg-[#ffaaab]/15 transition-all duration-500" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 rounded-full bg-[#feb300]/5 blur-3xl group-hover:bg-[#feb300]/10 transition-all duration-500" />

        <input
          ref={fileInputRef}
          type="file"
          accept=".mid,.midi,.xml,.musicxml"
          onChange={handleFileInput}
          className="hidden"
        />

        {loading ? (
          <div className="flex flex-col items-center space-y-6 relative z-10 w-full max-w-xs">
            {/* Animated Violin Bow Progress Indicator */}
            <div className="relative w-full h-8 bg-white/50 border border-[#2b1b24]/10 rounded-full overflow-hidden flex items-center px-2">
              <div 
                ref={bowRef}
                className="absolute left-1 w-14 h-4 bg-gradient-to-r from-[#ff5e6c] via-[#ffaaab] to-[#ff5e6c] rounded-md shadow-[0_0_12px_rgba(255,94,108,0.4)]"
              />
              {/* String representation */}
              <div className="w-full h-[1px] bg-[#2b1b24]/20 absolute left-0 right-0" />
            </div>

            <div className="space-y-1">
              <p className="text-[#ff5e6c] font-extrabold tracking-wide uppercase text-xs animate-pulse font-royal">
                Tuning & Parsing score...
              </p>
              <p className="text-[10px] text-[#6e5c66] font-medium">Bowing through the MIDI coordinates</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-5 relative z-10">
            {/* Elegant Coral Pink Container for Icons */}
            <div className={`p-5 rounded-2xl bg-white border border-[#2b1b24]/10 text-[#ff5e6c] group-hover:scale-105 group-hover:text-[#ff5e6c]/80 transition-all duration-500 shadow-sm ${
              fileName 
                ? "border-[#ff5e6c] text-[#ff5e6c] shadow-[0_0_20px_rgba(255,94,108,0.1)]" 
                : ""
            }`}>
              {fileName ? (
                <FileCheck size={44} className="animate-bounce" style={{ animationDuration: '2.5s' }} />
              ) : (
                <Music size={44} className="group-hover:rotate-6 transition-transform duration-500" />
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-xl font-bold text-[#2b1b24] tracking-wide leading-none font-royal">
                {fileName ? fileName : "Open Violin Case to Load Score"}
              </p>
              <p className="text-xs text-[#6e5c66] font-manuscript max-w-md mx-auto leading-relaxed italic">
                {fileName 
                  ? "Drop a new score here to replace active tracks" 
                  : "Drag and drop your MIDI or MusicXML sheet here to begin conversion"
                }
              </p>
            </div>

            {!fileName && (
              <button
                type="button"
                className="mt-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#ff5e6c] to-[#ff5e6c]/90 hover:from-[#ff5e6c]/90 hover:to-[#ff5e6c]/80 text-white text-xs font-bold uppercase tracking-wider btn-premium cursor-pointer shadow-md shadow-[#ff5e6c]/15"
              >
                Select Score
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-center space-x-3 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold animate-shake shadow-sm">
          <AlertCircle size={18} className="flex-shrink-0 text-red-500" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}

export default React.memo(FileUpload);
