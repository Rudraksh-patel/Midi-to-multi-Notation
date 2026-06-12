/**
 * MusicXML Parser Utility
 * Parses standard .musicxml / .xml files using the browser's native DOMParser.
 * Converts notes into the unified { pitch, time, duration } structure.
 */

export function parseMusicXML(xmlText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  
  // Check for XML parsing errors
  const parseError = xmlDoc.getElementsByTagName("parsererror");
  if (parseError.length > 0) {
    throw new Error("Invalid XML file format: " + parseError[0].textContent);
  }
  
  const notes = [];
  
  // Find parts
  const parts = xmlDoc.getElementsByTagName("part");
  if (parts.length === 0) {
    throw new Error("No musical parts found in the MusicXML file.");
  }
  
  // We parse the first part (usually carries the lead melody in vocal scores)
  const part = parts[0];
  const measures = part.getElementsByTagName("measure");
  
  let currentTimeBeats = 0; // Cumulative time in beats
  let divisions = 1;         // Beat division factor (ticks per quarter note)
  let bpm = 120;             // Tempo indicator
  
  const BASE_KEYS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  
  let lastNoteTimeBeats = 0;
  let lastNoteDurationBeats = 0;
  
  for (let m = 0; m < measures.length; m++) {
    const measure = measures[m];
    
    // Update divisions inside attributes if present
    const attributes = measure.getElementsByTagName("attributes")[0];
    if (attributes) {
      const divsEl = attributes.getElementsByTagName("divisions")[0];
      if (divsEl) {
        divisions = Number(divsEl.textContent) || 1;
      }
    }
    
    // Update tempo inside direction if present
    const directions = measure.getElementsByTagName("direction");
    for (let d = 0; d < directions.length; d++) {
      const sound = directions[d].getElementsByTagName("sound")[0];
      if (sound) {
        const tempoAttr = sound.getAttribute("tempo");
        if (tempoAttr) {
          bpm = Number(tempoAttr) || 120;
        }
      }
    }
    
    const children = measure.children;
    for (let c = 0; c < children.length; c++) {
      const child = children[c];
      
      if (child.tagName === "note") {
        const isRest = child.getElementsByTagName("rest").length > 0;
        const isChord = child.getElementsByTagName("chord").length > 0;
        
        const durationVal = Number(child.getElementsByTagName("duration")[0]?.textContent || 0);
        const durationBeats = durationVal / divisions;
        
        const secondsPerBeat = 60 / bpm;
        
        if (isRest) {
          // Rests simply advance the timeline cursor
          currentTimeBeats += durationBeats;
          continue;
        }
        
        // Extract pitch
        const pitchEl = child.getElementsByTagName("pitch")[0];
        if (!pitchEl) {
          // If no pitch block, treat as an unpitched note (advance cursor if not a chord note)
          if (!isChord) {
            currentTimeBeats += durationBeats;
          }
          continue;
        }
        
        const step = pitchEl.getElementsByTagName("step")[0]?.textContent;
        const octave = Number(pitchEl.getElementsByTagName("octave")[0]?.textContent || 4);
        const alter = Number(pitchEl.getElementsByTagName("alter")[0]?.textContent || 0);
        
        if (!step) {
          if (!isChord) {
            currentTimeBeats += durationBeats;
          }
          continue;
        }
        
        let semitone = BASE_KEYS[step.toUpperCase()];
        if (semitone === undefined) semitone = 0;
        semitone += alter;
        
        // Compute MIDI Note pitch
        const pitch = (octave + 1) * 12 + semitone;
        
        let noteTimeBeats = currentTimeBeats;
        
        if (isChord) {
          // Chord notes start at the same timestamp as the previous note
          noteTimeBeats = lastNoteTimeBeats;
        } else {
          // Normal notes start at current time and advance the cursor
          currentTimeBeats += durationBeats;
        }
        
        notes.push({
          pitch,
          midi: pitch, // compatible with SVG Piano Roll expectation of .midi property
          time: noteTimeBeats * secondsPerBeat,
          duration: durationBeats * secondsPerBeat,
          velocity: 0.7
        });
        
        // Store cache to map chords correctly
        if (!isChord) {
          lastNoteTimeBeats = noteTimeBeats;
          lastNoteDurationBeats = durationBeats;
        }
      }
    }
  }
  
  return notes;
}
