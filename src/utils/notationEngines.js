/**
 * Notation engines for Western Scientific Pitch Notation (SPN) 
 * and Indian Classical Sargam Notation.
 */

const PITCH_NAMES_SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const SARGAM_MAP = {
  0: "S",
  1: "r", // Komal Re (lowercase)
  2: "R", // Shuddha Re
  3: "g", // Komal Ga (lowercase)
  4: "G", // Shuddha Ga
  5: "m", // Shuddha Ma (lowercase)
  6: "M", // Tivra Ma (uppercase)
  7: "P", // Pa
  8: "d", // Komal Dha (lowercase)
  9: "D", // Shuddha Dha
  10: "n", // Komal Ni (lowercase)
  11: "N"  // Shuddha Ni
};

/**
 * Calculates the number of semitones to shift when transposing from an original scale to a target scale.
 */
export function calculateTranspositionShift(originalKey, targetKey) {
  if (!originalKey || !targetKey) return 0;
  
  // Extract roots
  const originalRootStr = originalKey.split(" ")[0];
  const targetRootStr = targetKey.split(" ")[0];
  
  const originalRoot = PITCH_NAMES_SHARPS.indexOf(originalRootStr);
  const targetRoot = PITCH_NAMES_SHARPS.indexOf(targetRootStr);
  
  if (originalRoot === -1 || targetRoot === -1) return 0;
  
  let shift = (targetRoot - originalRoot) % 12;
  if (shift > 5) shift -= 12;
  if (shift < -6) shift += 12;
  
  return shift;
}

/**
 * Formats a single MIDI note into Western Scientific Pitch Notation
 * strictly using sharps.
 * 
 * @param {number} pitch - MIDI note pitch
 * @param {number} shift - Semitones shift
 * @returns {string} - e.g. "C#4", "F5"
 */
export function midiToWestern(pitch, shift = 0) {
  const finalPitch = pitch + shift;
  const noteIndex = finalPitch % 12;
  const octave = Math.floor(finalPitch / 12) - 1;
  return `${PITCH_NAMES_SHARPS[noteIndex]}${octave}`;
}

/**
 * Formats a single MIDI note into Indian Classical Sargam Notation relative to a "Sa" root note.
 * 
 * @param {number} pitch - MIDI note pitch
 * @param {number} saRootIndex - Chromatic index of "Sa" root (0-11, e.g. C=0, C#=1)
 * @param {number} saOctave - Octave of base Sa (usually 4)
 * @returns {string} - e.g. "Sa", "Re*", "_ni"
 */
export function midiToSargam(pitch, saRootIndex = 2, saOctave = 4) {
  // Base "Sa" MIDI note
  const saMidiBase = (saOctave + 1) * 12 + saRootIndex;
  
  const diff = pitch - saMidiBase;
  const relativeSemitone = ((diff % 12) + 12) % 12;
  const octaveOffset = Math.floor(diff / 12);
  
  // Custom Bansuri/Hindustani shorthand notes mapping
  const sargamBaseChars = {
    0: "S", 1: "R", 2: "R", 3: "G", 4: "G", 5: "m",
    6: "M", 7: "P", 8: "D", 9: "D", 10: "N", 11: "N"
  };
  const isKomal = [1, 3, 8, 10].includes(relativeSemitone);

  let char = sargamBaseChars[relativeSemitone];
  
  if (octaveOffset < 0) {
    // Low octave gets lowercase conversion
    char = char.toLowerCase();
    return isKomal ? `${char}(k)` : char;
  } else if (octaveOffset > 0) {
    // High octave gets single quote (') marks
    const quotes = "'".repeat(octaveOffset);
    return isKomal ? `${char}${quotes}(k)` : `${char}${quotes}`;
  } else {
    return isKomal ? `${char}(k)` : char;
  }
}

/**
 * Groups monophonic notes into musical phrases/lines using silence thresholds and visual length heuristics.
 * Ensures notes are nicely arranged line-by-line without looking cluttered or wrapping.
 */
export function groupNotesIntoPhrases(notes, options = {}) {
  if (!notes || notes.length === 0) return [];
  
  const {
    phraseBreakGap = 1.0,
    stepDuration = 0.25,
    maxVisualLength = 20,
    minVisualLength = 8
  } = options;
  
  const phrases = [];
  let currentPhrase = [];
  let currentVisualLength = 0;
  
  notes.forEach((note, i) => {
    const prev = i > 0 ? notes[i - 1] : null;
    const silence = prev ? note.time - (prev.time + prev.duration) : 0;
    const steps = Math.max(1, Math.round(note.duration / stepDuration));
    
    let shouldBreak = false;
    if (prev) {
      if (silence >= phraseBreakGap) {
        shouldBreak = true;
      } else if (currentVisualLength >= minVisualLength && silence >= 0.15) {
        shouldBreak = true;
      } else if (currentVisualLength >= 12 && silence >= 0.05) {
        shouldBreak = true;
      } else if (currentVisualLength + steps > maxVisualLength) {
        shouldBreak = true;
      }
    }
    
    if (shouldBreak && currentPhrase.length > 0) {
      phrases.push(currentPhrase);
      currentPhrase = [];
      currentVisualLength = 0;
    }
    
    currentPhrase.push(note);
    currentVisualLength += steps;
  });
  
  if (currentPhrase.length > 0) {
    phrases.push(currentPhrase);
  }
  
  return phrases;
}

/**
 * Translates an array of monophonic notes into formatted paragraphs/lines of notation
 * based on tempo, sustained beats, and phrasing gaps.
 * 
 * @param {Array} notes - Array of isolated notes
 * @param {Object} options - Configuration options
 * @param {string} options.notationType - 'western' or 'sargam'
 * @param {number} options.transpositionShift - Transposition shift in semitones (Western)
 * @param {number} options.saRootIndex - Root note index for Sa (0-11, Sargam)
 * @param {number} options.saOctave - Root note octave (Sargam, default 4)
 * @param {number} options.stepDuration - Standard unit duration in seconds for dash sustain (-)
 * @param {number} options.phraseBreakGap - Gap in seconds between notes to trigger a new line
 * @returns {string} - Formatted multiline string of sheet music
 */
export function generateNotationText(notes, options = {}) {
  if (!notes || notes.length === 0) return "";
  
  const {
    notationType = "western",
    transpositionShift = 0,
    saRootIndex = 2,
    saOctave = 4,
    stepDuration = 0.25,
    phraseBreakGap = 1.0
  } = options;
  
  // Group notes using the smart phrasing helper
  const phrases = groupNotesIntoPhrases(notes, { phraseBreakGap, stepDuration });
  
  const lines = phrases.map(phrase => {
    const currentLine = [];
    
    phrase.forEach(current => {
      // Format note core pitch
      let noteName = "";
      if (notationType === "western") {
        noteName = midiToWestern(current.pitch, transpositionShift);
      } else {
        noteName = midiToSargam(current.pitch + transpositionShift, saRootIndex, saOctave);
      }
      
      // Rhythmic Sustain Rule
      const steps = Math.max(1, Math.round(current.duration / stepDuration));
      if (steps > 1) {
        const dashes = Array(steps - 1).fill("-").join(" ");
        noteName = `${noteName} ${dashes}`;
      }
      
      currentLine.push(noteName);
    });
    
    return currentLine.join("  ");
  });
  
  return lines.join("\n\n");
}

/**
 * Evaluates compatible owned flutes for a given melody based on physical ranges.
 * Range of a standard Bansuri in key K is [K - 5 (lower Pa), K + 18 (higher Tivra Ma)].
 */
export function matchBansuriKeys(notes, ownedFlutes = ["C", "D", "G"]) {
  if (!notes || notes.length === 0) return [];
  
  const pitches = notes.map(n => n.pitch);
  const P_min = Math.min(...pitches);
  const P_max = Math.max(...pitches);
  const songRange = P_max - P_min;
  
  const recommendations = [];
  const PITCH_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  
  ownedFlutes.forEach(fluteName => {
    const rootIndex = PITCH_NAMES.indexOf(fluteName);
    if (rootIndex === -1) return;
    
    // saOctave is 4, base Sa of flute key fluteName
    const K = 60 + rootIndex;
    const fluteMin = K - 5;  // Mandra Pa (p)
    const fluteMax = K + 18; // Taar Tivra Ma (M')
    
    let matched = false;
    let requiredOctaveShift = 0;
    
    // Test octave shifts -3 to +3
    for (let oShift = -3; oShift <= 3; oShift++) {
      const shiftedMin = P_min + (oShift * 12);
      const shiftedMax = P_max + (oShift * 12);
      
      if (shiftedMin >= fluteMin && shiftedMax <= fluteMax) {
        matched = true;
        requiredOctaveShift = oShift;
        break;
      }
    }
    
    if (matched) {
      recommendations.push({
        flute: fluteName,
        compatible: true,
        octaveShift: requiredOctaveShift,
        saRootIndex: rootIndex,
        message: `Fits beautifully on your ${fluteName} flute! Set Sa = ${fluteName} and Octave = ${requiredOctaveShift > 0 ? '+' : ''}${requiredOctaveShift}.`
      });
    } else {
      recommendations.push({
        flute: fluteName,
        compatible: false,
        songRange,
        message: `Range of ${songRange} semitones is too wide for a standard ${fluteName} flute.`
      });
    }
  });
  
  return recommendations;
}

