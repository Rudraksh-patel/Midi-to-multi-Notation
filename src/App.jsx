import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as Tone from "tone";
import { Music, Play, HelpCircle, Sparkles, AlertCircle } from "lucide-react";
import FileUpload from "./components/FileUpload";
import ViolinHero from "./components/ViolinHero";
import ControlPanel from "./components/ControlPanel";
import VisualPianoRoll from "./components/VisualPianoRoll";
import NotationDisplay from "./components/NotationDisplay";
import ErrorBoundary from "./components/ErrorBoundary";
import { parseMusicXML } from "./utils/musicXmlParser";
import { Midi } from "@tonejs/midi";
import { saveFile, deleteFile, getAllStarred } from "./utils/db";

// Utility Algorithms
import { filterMelodySkyline } from "./utils/skylineFilter";
import { detectKey } from "./utils/keyDetector";
import { 
  calculateTranspositionShift, 
  generateNotationText
} from "./utils/notationEngines";

const PITCH_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const RAGA_YAMAN_NOTES = [
  { pitch: 60, time: 0.0, duration: 0.5 }, // S
  { pitch: 62, time: 0.6, duration: 0.5 }, // R
  { pitch: 64, time: 1.2, duration: 0.8 }, // G
  { pitch: 66, time: 2.1, duration: 0.5 }, // M (Tivra)
  { pitch: 67, time: 2.7, duration: 0.8 }, // P
  { pitch: 69, time: 3.6, duration: 0.5 }, // D
  { pitch: 71, time: 4.2, duration: 0.8 }, // N
  { pitch: 72, time: 5.1, duration: 1.2 }, // S'
  { pitch: 71, time: 6.5, duration: 0.5 }, // N
  { pitch: 69, time: 7.1, duration: 0.8 }, // D
  { pitch: 67, time: 8.0, duration: 0.8 }, // P
  { pitch: 66, time: 8.9, duration: 0.5 }, // M
  { pitch: 64, time: 9.5, duration: 0.8 }, // G
  { pitch: 62, time: 10.4, duration: 0.5 }, // R
  { pitch: 60, time: 11.0, duration: 1.5 }  // S
];

const RAGA_BHAIRAVI_NOTES = [
  { pitch: 60, time: 0.0, duration: 0.6 }, // S
  { pitch: 61, time: 0.7, duration: 0.6 }, // r (Komal Re)
  { pitch: 63, time: 1.4, duration: 0.8 }, // g (Komal Ga)
  { pitch: 65, time: 2.3, duration: 0.6 }, // m
  { pitch: 67, time: 3.0, duration: 0.8 }, // P
  { pitch: 68, time: 3.9, duration: 0.6 }, // d (Komal Dha)
  { pitch: 70, time: 4.6, duration: 0.8 }, // n (Komal Ni)
  { pitch: 72, time: 5.5, duration: 1.2 }, // S'
  { pitch: 70, time: 6.8, duration: 0.6 }, // n
  { pitch: 68, time: 7.5, duration: 0.8 }, // d
  { pitch: 67, time: 8.4, duration: 0.8 }, // P
  { pitch: 65, time: 9.3, duration: 0.6 }, // m
  { pitch: 63, time: 10.0, duration: 0.8 }, // g
  { pitch: 61, time: 10.9, duration: 0.6 }, // r
  { pitch: 60, time: 11.6, duration: 1.5 }  // S
];

const DEMO_TWINKLE_NOTES = [
  { pitch: 60, time: 0.0, duration: 0.4 }, // C
  { pitch: 60, time: 0.5, duration: 0.4 }, // C
  { pitch: 67, time: 1.0, duration: 0.4 }, // G
  { pitch: 67, time: 1.5, duration: 0.4 }, // G
  { pitch: 69, time: 2.0, duration: 0.4 }, // A
  { pitch: 69, time: 2.5, duration: 0.4 }, // A
  { pitch: 67, time: 3.0, duration: 0.8 }, // G
  { pitch: 65, time: 4.0, duration: 0.4 }, // F
  { pitch: 65, time: 4.5, duration: 0.4 }, // F
  { pitch: 64, time: 5.0, duration: 0.4 }, // E
  { pitch: 64, time: 5.5, duration: 0.4 }, // E
  { pitch: 62, time: 6.0, duration: 0.4 }, // D
  { pitch: 62, time: 6.5, duration: 0.4 }, // D
  { pitch: 60, time: 7.0, duration: 0.8 }  // C
];

export default function App() {
  // 1. File & Parsing State
  const [midiFile, setMidiFile] = useState(null); // { fileName, midiData }
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  
  // 2. Transposition & Notation State
  const [notationType, setNotationType] = useState("western");
  const [detectedKeyName, setDetectedKeyName] = useState("C Major");
  const [detectedKeyRoot, setDetectedKeyRoot] = useState(0); // Chromatic index
  const [targetKey, setTargetKey] = useState("C Major");
  const [saRootIndex, setSaRootIndex] = useState(2); // Root note for "Sa" (0-11) — Default to D (2) instead of C (0)
  const [autoSyncSa, setAutoSyncSa] = useState(true);
  
  // 3. Fine-tuning Rhythmic Formatting State
  const [stepDuration, setStepDuration] = useState(0.25);
  const [phraseBreakGap, setPhraseBreakGap] = useState(1.0);
  
  // 4. Playback and Synthesis State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [synthType, setSynthType] = useState("piano");
  const [bpm, setBpm] = useState(120); // Auto-detected or user-adjusted
  const [detectedBpm, setDetectedBpm] = useState(120); // Original MIDI tempo

  // 5. PDF Layout Customizer States
  const [printFont, setPrintFont] = useState("mono"); // "serif" | "sans" | "mono"
  const [printMargin, setPrintMargin] = useState("standard"); // "compact" | "standard" | "wide"
  const [printPadding, setPrintPadding] = useState("regular"); // "compact" | "regular" | "spacious"
  const [showPrintHeader, setShowPrintHeader] = useState(true);
  const [octaveShift, setOctaveShift] = useState(0); // -3 to +3 octaves
  const [loadedFileType, setLoadedFileType] = useState("midi"); // "midi" | "xml"
  const [customUploadedNotes, setCustomUploadedNotes] = useState(null);
  
  // 6. Starred Repertoire / IndexedDB Caching States
  const [starredFiles, setStarredFiles] = useState([]);
  const [activeRawFile, setActiveRawFile] = useState(null);
  const [isActiveStarred, setIsActiveStarred] = useState(false);

  // 7. Workspace state (hero, studio)
  const [activeWorkspace, setActiveWorkspace] = useState("hero");

  useEffect(() => {
    getAllStarred()
      .then(list => setStarredFiles(list))
      .catch(err => console.error("Error loading starred files list:", err));
  }, []);
  
  const synthRef = useRef(null);
  const partRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Audio Effects Refs
  const reverbRef = useRef(null);
  const delayRef = useRef(null);
  const vibratoRef = useRef(null);
  const analyserRef = useRef(null);

  // --- Core Computations ---

  // A. Extract notes of the selected track
  const rawTrackNotes = useMemo(() => {
    if (!midiFile || !midiFile.midiData) return [];
    const track = midiFile.midiData.tracks[selectedTrackIndex];
    if (!track || !track.notes) return [];
    return track.notes.map(note => ({
      pitch: note.midi,
      time: note.time,
      duration: note.duration,
      velocity: note.velocity
    }));
  }, [midiFile, selectedTrackIndex]);

  // B. Isolate the main melody track using the Skyline Filter
  const skylineMelodyNotes = useMemo(() => {
    if (loadedFileType === "xml" && customUploadedNotes) {
      return filterMelodySkyline(customUploadedNotes);
    }
    return filterMelodySkyline(rawTrackNotes);
  }, [loadedFileType, customUploadedNotes, rawTrackNotes]);

  // C. Recalculate original track key signature on melody change
  useEffect(() => {
    if (skylineMelodyNotes.length === 0) return;
    
    const keyInfo = detectKey(skylineMelodyNotes);
    setDetectedKeyName(keyInfo.keyName);
    setDetectedKeyRoot(keyInfo.rootIndex);
    
    // Auto-align default targets to match the detected key perfectly!
    setTargetKey(keyInfo.keyName);
    setSaRootIndex(keyInfo.rootIndex);
    
    // Auto-estimate an optimal starting Step Duration (sustain unit)
    const totalDur = skylineMelodyNotes.reduce((sum, n) => sum + n.duration, 0);
    const avgDur = totalDur / skylineMelodyNotes.length;
    let optimalStep = 0.25;
    if (avgDur > 0) {
      optimalStep = Math.max(0.05, Math.min(0.60, Math.round(avgDur * 20) / 20));
    }
    setStepDuration(optimalStep);
    
    // Stop any active synth playback when the melody track swaps
    handleStopPlayback();
  }, [skylineMelodyNotes]);

  // C2. Auto-detect BPM from MIDI header tempo metadata
  useEffect(() => {
    if (!midiFile || !midiFile.midiData) return;
    const tempos = midiFile.midiData.header?.tempos;
    if (tempos && tempos.length > 0) {
      // Use the first tempo marking (most MIDI files have one)
      const midiBpm = Math.round(tempos[0].bpm);
      const clampedBpm = Math.max(20, Math.min(300, midiBpm));
      setDetectedBpm(clampedBpm);
      setBpm(clampedBpm);
    } else {
      setDetectedBpm(120);
      setBpm(120);
    }
  }, [midiFile]);

  // C3. Auto-sync Sa root index to detectedKeyRoot when autoSyncSa is enabled
  useEffect(() => {
    if (autoSyncSa) {
      setSaRootIndex(detectedKeyRoot);
    }
  }, [detectedKeyRoot, autoSyncSa]);

  // D. Calculate active transposition semitones shift
  const transpositionShift = useMemo(() => {
    // Find semitone distance between detected key and target transposition scale
    const originalRootStr = detectedKeyName.split(" ")[0];
    const targetRootStr = targetKey.split(" ")[0];
    
    const origRootIndex = PITCH_NAMES.indexOf(originalRootStr);
    const targRootIndex = PITCH_NAMES.indexOf(targetRootStr);
    
    if (origRootIndex === -1 || targRootIndex === -1) return 0;
    
    let shift = (targRootIndex - origRootIndex) % 12;
    // Keep transposition interval tight (-6 to +5) to keep it in a comfortable octave range
    if (shift > 5) shift -= 12;
    if (shift < -6) shift += 12;
    
    return shift;
  }, [detectedKeyName, targetKey]);

  // E. Calculate the total semitones shift for audio playback and sheet transcription
  const activePlaybackShift = useMemo(() => {
    return transpositionShift + (octaveShift * 12);
  }, [transpositionShift, octaveShift]);

  // F. Convert notes array into formatted notation text
  const notationOutputText = useMemo(() => {
    if (skylineMelodyNotes.length === 0) return "";
    
    return generateNotationText(skylineMelodyNotes, {
      notationType,
      transpositionShift: activePlaybackShift,
      saRootIndex,
      saOctave: 4, // standard middle register
      stepDuration,
      phraseBreakGap
    });
  }, [skylineMelodyNotes, notationType, activePlaybackShift, saRootIndex, stepDuration, phraseBreakGap]);

  // --- Audio Synthesis Playback Engines ---

  // Initialize shared spatial audio effects once on Audio Context start
  const initEffects = () => {
    if (!reverbRef.current) {
      // Lush, warm room/hall simulation
      reverbRef.current = new Tone.Reverb({
        decay: 2.2,
        preDelay: 0.01,
        wet: 0.35 // 35% wet mix
      }).toDestination();
    }

    if (!delayRef.current) {
      // Soft rhythmic ping-pong style delay tail
      delayRef.current = new Tone.FeedbackDelay({
        delayTime: "8n.",
        feedback: 0.2,
        wet: 0.2 // 20% wet mix
      }).toDestination();
    }

    if (!vibratoRef.current) {
      // Soft flutist lip vibrato (frequency 5.5Hz, gentle pitch wobble)
      vibratoRef.current = new Tone.Vibrato({
        frequency: 5.5,
        depth: 0.15
      });
      // Route vibrato output to the shared reverb, delay and speakers
      vibratoRef.current.connect(reverbRef.current);
      vibratoRef.current.connect(delayRef.current);
      vibratoRef.current.toDestination();
    }

    if (!analyserRef.current) {
      analyserRef.current = new Tone.Analyser("waveform", 256);
    }
  };

  // Creates the specific synthesizer voice
  const createSynthVoice = (type) => {
    if (synthRef.current) {
      synthRef.current.dispose();
    }

    // Ensure our ambient effects chain is registered
    initEffects();

    let synth;
    if (type === "piano") {
      // Warm felt-piano modeling simulation using a dynamic low-pass sweep
      synth = new Tone.MonoSynth({
        oscillator: { type: "triangle" },
        filter: {
          Q: 1.0,
          type: "lowpass",
          frequency: 300
        },
        envelope: {
          attack: 0.005,
          decay: 1.2,
          sustain: 0.2,
          release: 0.8
        },
        filterEnvelope: {
          attack: 0.01,
          decay: 0.4,
          sustain: 0.1,
          baseFrequency: 300,
          octaves: 2.2,
          exponent: 2
        }
      });
      
      // Connect to shared spatial delay and reverb
      synth.connect(reverbRef.current);
      synth.connect(delayRef.current);
      synth.toDestination();
    } else if (type === "sine") {
      // Pure wind flute timbre with subtle human throat vibrato LFO
      synth = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: {
          attack: 0.08,
          decay: 0.6,
          sustain: 0.7,
          release: 0.6
        }
      });
      
      // Connect through vibrato first, which cascades to spatial chains
      synth.connect(vibratoRef.current);
    } else if (type === "triangle") {
      // Soft recorder/woodwind
      synth = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: {
          attack: 0.04,
          decay: 0.4,
          sustain: 0.6,
          release: 0.4
        }
      });
      
      synth.connect(reverbRef.current);
      synth.connect(delayRef.current);
      synth.toDestination();
    } else {
      // Buzzing sawtooth vintage synthesizer lead (juicy analog Moog filter sweep)
      synth = new Tone.MonoSynth({
        oscillator: { type: "sawtooth" },
        filter: {
          Q: 3.5,
          type: "lowpass",
          frequency: 200
        },
        envelope: {
          attack: 0.02,
          decay: 0.3,
          sustain: 0.5,
          release: 0.4
        },
        filterEnvelope: {
          attack: 0.05,
          decay: 0.3,
          sustain: 0.2,
          baseFrequency: 200,
          octaves: 3.5,
          exponent: 2
        }
      });
      
      synth.connect(reverbRef.current);
      synth.connect(delayRef.current);
      synth.toDestination();
    }

    if (analyserRef.current) {
      synth.connect(analyserRef.current);
    }

    synthRef.current = synth;
    return synth;
  };

  // Re-generate synthesizer when the voice drops down
  useEffect(() => {
    if (isPlaying) {
      // Ensure shared effects nodes are initialized
      initEffects();
      // Swap voice on the fly without stopping transport
      createSynthVoice(synthType);
    }
  }, [synthType]);

  // Dynamic transposer: Re-schedule/update note frequencies on the fly if transpositions or octaves shift during active playback!
  useEffect(() => {
    if (!isPlaying || !synthRef.current || skylineMelodyNotes.length === 0) return;

    // A. Re-map notes using the updated activePlaybackShift
    const partEvents = skylineMelodyNotes.map(note => {
      const playbackMidi = note.pitch + activePlaybackShift;
      const noteFreq = Tone.Frequency(playbackMidi, "midi").toFrequency();
      
      return {
        time: note.time,
        note: noteFreq,
        duration: note.duration,
        velocity: note.velocity || 0.7
      };
    });

    // B. Dispose of the active part
    if (partRef.current) {
      partRef.current.dispose();
    }

    // C. Re-create the Tone.Part with the new pitch events
    const part = new Tone.Part((time, value) => {
      if (synthRef.current) {
        try {
          synthRef.current.triggerAttackRelease(value.note, value.duration, time, value.velocity);
        } catch (e) {
          console.warn("Overlapping note trigger bypassed:", e);
        }
      }
    }, partEvents);

    part.start(0);
    partRef.current = part;

  }, [activePlaybackShift, skylineMelodyNotes, isPlaying]);

  const handlePlayToggle = async () => {
    if (isPlaying) {
      handlePausePlayback();
      return;
    }

    if (skylineMelodyNotes.length === 0) return;

    try {
      // A. Start Tone Audio Context
      await Tone.start();
      
      // B. Create synth voice
      const synth = createSynthVoice(synthType);
      
      // C. Dispose of existing Scheduled Parts
      if (partRef.current) {
        partRef.current.dispose();
      }

      // D. Map notes array into Tone.js Part events
      // Shift notes based on the total unified active transposition and octave shift!
      const partEvents = skylineMelodyNotes.map(note => {
        const playbackMidi = note.pitch + activePlaybackShift;
        const noteFreq = Tone.Frequency(playbackMidi, "midi").toFrequency();
        
        return {
          time: note.time,
          note: noteFreq,
          duration: note.duration,
          velocity: note.velocity || 0.7
        };
      });

      // E. Initialize Tone.Part to schedule events
      // We look up synthRef.current dynamically to support live voice-swapping on the fly!
      const part = new Tone.Part((time, value) => {
        if (synthRef.current) {
          try {
            synthRef.current.triggerAttackRelease(value.note, value.duration, time, value.velocity);
          } catch (e) {
            console.warn("Overlapping note trigger bypassed:", e);
          }
        }
      }, partEvents);

      part.start(0);
      partRef.current = part;

      // F. Start Transport (BPM is display-only; notes use absolute seconds)
      Tone.Transport.bpm.value = 120;
      Tone.Transport.start();
      setIsPlaying(true);

      // G. Launch requestAnimationFrame loop to sweep playhead scan-line
      const updatePlayhead = () => {
        setPlaybackTime(Tone.Transport.seconds);
        
        // Loop safety: if we've passed the final note's end, stop play automatically
        const finalNote = skylineMelodyNotes[skylineMelodyNotes.length - 1];
        const finalTime = finalNote ? finalNote.time + finalNote.duration + 1.0 : 0;
        
        if (Tone.Transport.seconds > finalTime) {
          handleStopPlayback();
        } else {
          animationFrameRef.current = requestAnimationFrame(updatePlayhead);
        }
      };
      
      animationFrameRef.current = requestAnimationFrame(updatePlayhead);

    } catch (err) {
      console.error("Audio playback context creation failed", err);
    }
  };

  const handlePausePlayback = () => {
    Tone.Transport.pause();
    setIsPlaying(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const handleStopPlayback = () => {
    Tone.Transport.stop();
    setIsPlaying(false);
    setPlaybackTime(0);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (partRef.current) {
      partRef.current.dispose();
      partRef.current = null;
    }
    
    if (synthRef.current) {
      synthRef.current.dispose();
      synthRef.current = null;
    }
  };

  // Cleanup audio threads on unmount
  useEffect(() => {
    return () => {
      handleStopPlayback();
      // Dispose shared premium effects nodes on unmount to prevent audio graph leaks
      if (reverbRef.current) {
        reverbRef.current.dispose();
        reverbRef.current = null;
      }
      if (delayRef.current) {
        delayRef.current.dispose();
        delayRef.current = null;
      }
      if (vibratoRef.current) {
        vibratoRef.current.dispose();
        vibratoRef.current = null;
      }
    };
  }, []);

  // BPM is display-only metadata (notes are scheduled at absolute seconds)
  // No live transport sync needed

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in an input/textarea/select
      const tag = e.target.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          if (skylineMelodyNotes.length > 0) {
            handlePlayToggle();
          }
          break;
        case "Escape":
          e.preventDefault();
          handleStopPlayback();
          break;
        case "ArrowUp":
          e.preventDefault();
          setOctaveShift(prev => Math.min(3, prev + 1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setOctaveShift(prev => Math.max(-3, prev - 1));
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [skylineMelodyNotes, isPlaying]);

  // Seek handler: click on the piano roll to jump to a time position
  const handleSeek = useCallback((seekTime) => {
    if (!isPlaying) return;
    Tone.Transport.seconds = seekTime;
    setPlaybackTime(seekTime);
  }, [isPlaying]);

  // --- Handlers for User Uploads ---
  const handleMidiParsed = useCallback(({ fileName, midiData, rawFile }) => {
    // 1. Find the track with the maximum number of notes to auto-select as lead melody!
    let bestTrackIdx = 0;
    let maxNotes = 0;
    
    midiData.tracks.forEach((track, idx) => {
      const noteCount = track.notes?.length || 0;
      if (noteCount > maxNotes) {
        maxNotes = noteCount;
        bestTrackIdx = idx;
      }
    });

    setLoadedFileType("midi");
    setCustomUploadedNotes(null);
    setMidiFile({ fileName, midiData });
    setSelectedTrackIndex(bestTrackIdx);
    setActiveRawFile(rawFile || null);
    setIsActiveStarred(starredFiles.some(f => f.name === fileName));
    setActiveWorkspace("studio");
  }, [starredFiles]);

  const handleXmlParsed = useCallback(({ fileName, xmlData, rawFile }) => {
    try {
      const parsedNotes = parseMusicXML(xmlData);
      
      if (parsedNotes.length === 0) {
        throw new Error("No notes found in the MusicXML file.");
      }
      
      setLoadedFileType("xml");
      setCustomUploadedNotes(parsedNotes);
      // Mock midiFile with fileName and empty midiData structure to keep headers in sync!
      setMidiFile({ 
        fileName, 
        midiData: { 
          tracks: [{ name: "MusicXML Score", notes: parsedNotes }] 
        } 
      });
      setSelectedTrackIndex(0);
      setActiveRawFile(rawFile || null);
      setIsActiveStarred(starredFiles.some(f => f.name === fileName));
      setActiveWorkspace("studio");
    } catch (err) {
      alert("Error parsing MusicXML file: " + err.message);
    }
  }, [starredFiles]);

  const handleLoadDemo = useCallback((type) => {
    let notes = [];
    let name = "";
    if (type === "yaman") {
      notes = RAGA_YAMAN_NOTES;
      name = "Raga Yaman (Evening Serenade)";
    } else if (type === "bhairavi") {
      notes = RAGA_BHAIRAVI_NOTES;
      name = "Raga Bhairavi (Morning Devotion)";
    } else {
      notes = DEMO_TWINKLE_NOTES;
      name = "Twinkle Twinkle (Western Folk)";
    }
    
    setLoadedFileType("xml");
    setCustomUploadedNotes(notes);
    setMidiFile({
      fileName: `${type === "twinkle" ? "Twinkle_Twinkle" : type === "yaman" ? "Raga_Yaman" : "Raga_Bhairavi"}.xml`,
      midiData: {
        tracks: [{ name: name, notes: notes }]
      }
    });
    setSelectedTrackIndex(0);
    setActiveRawFile(null);
    setIsActiveStarred(false);
    setActiveWorkspace("studio");
  }, []);

  // IndexedDB Starring Event Handlers
  const toggleStarActiveFile = async () => {
    if (!midiFile) return;
    const name = midiFile.fileName;

    if (isActiveStarred) {
      // Un-star: delete from database
      await deleteFile(name);
      setIsActiveStarred(false);
      setStarredFiles(prev => prev.filter(f => f.name !== name));
    } else {
      // Star: save to database
      if (!activeRawFile) {
        alert("Repertoire demos cannot be starred locally.");
        return;
      }
      const type = name.endsWith(".xml") || name.endsWith(".musicxml") ? "xml" : "midi";
      await saveFile(name, activeRawFile, type);
      setIsActiveStarred(true);
      const updatedList = await getAllStarred();
      setStarredFiles(updatedList);
    }
  };

  const handleDeleteStarredFile = async (name) => {
    await deleteFile(name);
    setStarredFiles(prev => prev.filter(f => f.name !== name));
    if (midiFile && midiFile.fileName === name) {
      setIsActiveStarred(false);
    }
  };

  const handleLoadStarredFile = async (item) => {
    const fileBlob = item.blob;
    const extension = item.name.split(".").pop().toLowerCase();

    // Reset playback transport
    handleStopPlayback();

    if (extension === "xml" || extension === "musicxml") {
      try {
        const text = await fileBlob.text();
        const parsedNotes = parseMusicXML(text);

        if (parsedNotes.length === 0) {
          throw new Error("No notes found in the MusicXML file.");
        }

        setLoadedFileType("xml");
        setCustomUploadedNotes(parsedNotes);
        setMidiFile({
          fileName: item.name,
          midiData: {
            tracks: [{ name: "MusicXML Score", notes: parsedNotes }]
          }
        });
        setSelectedTrackIndex(0);
        setActiveRawFile(fileBlob);
        setIsActiveStarred(true);
        setActiveWorkspace("studio");
      } catch (err) {
        alert("Error loading starred MusicXML: " + err.message);
      }
    } else {
      try {
        const arrayBuffer = await fileBlob.arrayBuffer();
        const midi = new Midi(arrayBuffer);

        if (!midi.tracks || midi.tracks.length === 0) {
          throw new Error("No MIDI tracks found in the file.");
        }

        let bestTrackIdx = 0;
        let maxNotes = 0;

        midi.tracks.forEach((track, idx) => {
          const noteCount = track.notes?.length || 0;
          if (noteCount > maxNotes) {
            maxNotes = noteCount;
            bestTrackIdx = idx;
          }
        });

        setLoadedFileType("midi");
        setCustomUploadedNotes(null);
        setMidiFile({ fileName: item.name, midiData: midi });
        setSelectedTrackIndex(bestTrackIdx);
        setActiveRawFile(fileBlob);
        setIsActiveStarred(true);
        setActiveWorkspace("studio");
      } catch (err) {
        alert("Error loading starred MIDI: " + err.message);
      }
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col justify-between relative px-6 md:px-12 py-8 md:py-10 overflow-x-hidden transition-colors duration-300">
      
      {/* Retro Grid backplane background */}
      <div className="retro-grid-container">
        <div className="retro-grid-bg" />
      </div>

      {/* Dynamic Background Ambient Glowing Elements */}
      <div className="absolute top-[10%] left-[20%] w-[450px] h-[450px] rounded-full bg-amber-500/4 blur-[120px] pointer-events-none pulse-glow" />
      <div className="absolute bottom-[20%] right-[10%] w-[350px] h-[350px] rounded-full bg-orange-600/3 blur-[100px] pointer-events-none pulse-glow" />

      {/* Main Container */}
      <main className="flex-grow w-full max-w-none z-10 px-2">
        
        {/* Header App Title & Premium Branding */}
        <header className="text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-[#ff5e6c]/25 bg-[#ff5e6c]/5 text-[#ff5e6c] text-xs font-bold uppercase tracking-widest mb-4 shadow-sm font-royal">
            <Sparkles size={13} className="animate-pulse" />
            Next-Gen Music Transposer Studio
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#ff5e6c] via-[#feb300] to-[#ff5e6c] tracking-tight leading-tight mb-4 font-royal">
            MIDI to Multi-Notation <br className="hidden sm:inline" /> Letter Notes Web App
          </h1>
          
          <p className="text-sm md:text-base text-[#6e5c66] font-manuscript max-w-xl mx-auto leading-relaxed mb-6 italic">
            Drag-and-drop a MIDI file, isolate the lead melody via the Skyline algorithm, and convert pitches dynamically to sharp-only Western SPN or Indian Sargam.
          </p>

          {activeWorkspace !== "hero" && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => {
                  handleStopPlayback();
                  setMidiFile(null);
                  setActiveWorkspace("hero");
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#2b1b24]/10 bg-white hover:bg-slate-50 text-[#2b1b24] hover:text-[#ff5e6c] text-xs font-extrabold uppercase tracking-widest shadow-sm cursor-pointer transition select-none active:scale-95 outline-none font-royal"
              >
                ← Back to Dashboard
              </button>
            </div>
          )}

        </header>

        {/* Action Panel */}
        <section className="space-y-4">
          {activeWorkspace === "studio" && midiFile ? (
            /* Activated UI Workspace */
            <ErrorBoundary>
              <div className="space-y-4 animate-fadeIn">
                {/* 1. Drag & Drop File Upload */}
                <FileUpload onMidiParsed={handleMidiParsed} onXmlParsed={handleXmlParsed} />
                
                {/* 2. Control settings and Key indicators */}
                <ControlPanel
                  tracks={midiFile.midiData.tracks}
                  selectedTrackIndex={selectedTrackIndex}
                  onSelectTrack={setSelectedTrackIndex}
                  notationType={notationType}
                  onChangeNotationType={setNotationType}
                  detectedKey={detectedKeyName}
                  targetKey={targetKey}
                  onChangeTargetKey={setTargetKey}
                  saRootIndex={saRootIndex}
                  onChangeSaRoot={setSaRootIndex}
                  autoSyncSa={autoSyncSa}
                  onChangeAutoSyncSa={setAutoSyncSa}
                  octaveShift={octaveShift}
                  onChangeOctaveShift={setOctaveShift}
                />

                {/* 3. Visual SVG Piano Roll */}
                <VisualPianoRoll
                  midiData={midiFile.midiData}
                  selectedTrackIndex={selectedTrackIndex}
                  skylineNotes={skylineMelodyNotes}
                  isPlaying={isPlaying}
                  playbackTime={playbackTime}
                  onSeek={handleSeek}
                />

                 {/* 4. Formatting Sliders & Notation Output Card */}
                 <NotationDisplay
                  notationText={notationOutputText}
                  isPlaying={isPlaying}
                  onPlayToggle={handlePlayToggle}
                  onStop={handleStopPlayback}
                  stepDuration={stepDuration}
                  onChangeStepDuration={setStepDuration}
                  phraseBreakGap={phraseBreakGap}
                  onChangePhraseBreakGap={setPhraseBreakGap}
                  synthType={synthType}
                  onChangeSynthType={setSynthType}
                  defaultFileName={midiFile?.fileName}
                  detectedKeyName={detectedKeyName}
                  printFont={printFont}
                  setPrintFont={setPrintFont}
                  printMargin={printMargin}
                  setPrintMargin={setPrintMargin}
                  printPadding={printPadding}
                  setPrintPadding={setPrintPadding}
                  showPrintHeader={showPrintHeader}
                  setShowPrintHeader={setShowPrintHeader}
                  skylineNotes={skylineMelodyNotes}
                  playbackTime={playbackTime}
                  notationType={notationType}
                  transpositionShift={activePlaybackShift}
                  saRootIndex={saRootIndex}
                  bpm={bpm}
                  onChangeBpm={setBpm}
                  detectedBpm={detectedBpm}
                  analyserNode={analyserRef.current}
                  isStarred={isActiveStarred}
                  onToggleStar={toggleStarActiveFile}
                />

              </div>
            </ErrorBoundary>
          ) : (
            <ViolinHero
              onMidiParsed={handleMidiParsed}
              onXmlParsed={handleXmlParsed}
              onLoadDemo={handleLoadDemo}
              starredFiles={starredFiles}
              onLoadStarredFile={handleLoadStarredFile}
              onDeleteStarredFile={handleDeleteStarredFile}
            />
          )}
        </section>
      </main>

      {/* Footer Branding */}
      <footer className="w-full max-w-none border-t border-white/5 pt-6 text-center text-xs text-gray-500 font-medium z-10 flex flex-col sm:flex-row justify-between items-center gap-3 mt-12 px-2">
        <p>© 2026 Antigravity IDE - Premium Single-Page Music Tools. Built with React & Tone.js.</p>
        <p className="flex items-center gap-1.5 bg-slate-900 border border-white/5 px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest text-violet-400">
          <span className="w-2 h-2 rounded-full bg-violetGlow animate-ping" />
          100% Client-Side / Serverless
        </p>
      </footer>
    </div>
  );
}
