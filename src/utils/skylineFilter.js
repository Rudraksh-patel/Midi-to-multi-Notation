/**
 * Skyline Melody Filtering Algorithm
 * Isolates the main melody track by filtering out lower harmony/chord notes.
 * If multiple notes overlap or occur at the same timestamp, it keeps only the note with the highest pitch.
 * Truncates note durations where necessary to ensure notes never overlap chronologically (monophonic).
 * 
 * @param {Array} notes - Array of note objects: { pitch, time, duration, velocity }
 * @returns {Array} - Clean, chronological, monophonic sequence of note objects
 */
export function filterMelodySkyline(notes) {
  if (!notes || notes.length === 0) return [];

  // 1. Sort notes by start time, and then by pitch descending (highest pitch first if starts together)
  const sortedNotes = [...notes].sort((a, b) => {
    if (Math.abs(a.time - b.time) < 0.05) {
      return b.pitch - a.pitch; // Highest pitch first
    }
    return a.time - b.time;
  });

  const skylineNotes = [];
  
  // 2. Filter out lower harmony notes at overlapping start times
  for (let i = 0; i < sortedNotes.length; i++) {
    const current = sortedNotes[i];
    
    // Check if we already have a note that starts at virtually the same time
    const isOverlappingStart = skylineNotes.some(note => 
      Math.abs(note.time - current.time) < 0.05
    );
    
    if (!isOverlappingStart) {
      skylineNotes.push({
        pitch: current.pitch,
        time: current.time,
        duration: current.duration,
        velocity: current.velocity || 0.7
      });
    }
  }

  // 3. Truncate durations to prevent chronological overlapping (force strictly monophonic sequence)
  // If note A starts at 1.0s and lasts 2.0s (ends at 3.0s), and note B starts at 2.0s,
  // we truncate note A's duration to 1.0s (ends at 2.0s).
  for (let i = 0; i < skylineNotes.length - 1; i++) {
    const current = skylineNotes[i];
    const next = skylineNotes[i + 1];
    
    const currentEndTime = current.time + current.duration;
    if (currentEndTime > next.time) {
      // Truncate current note duration to end exactly when the next note starts
      // Ensure we keep a small positive duration (minimum 0.05s) if next note starts exactly at or before current.time
      current.duration = Math.max(0.05, next.time - current.time);
    }
  }

  return skylineNotes;
}
