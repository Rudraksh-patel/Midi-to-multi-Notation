/**
 * Krumhansl-Schmuckler Key Detection Algorithm
 * Computes the key signature of a MIDI sequence by comparing note duration
 * distributions with standard Krumhansl-Kessler key profile vectors.
 */

// Krumhansl-Kessler key profiles (from 1984 study)
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const PITCH_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/**
 * Computes the Pearson correlation coefficient between two vectors
 */
function pearsonCorrelation(x, y) {
  const n = x.length;
  if (n !== y.length || n === 0) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  if (den === 0) return 0;
  return num / den;
}

/**
 * Detects the key signature of an array of notes
 * @param {Array} notes - Array of note objects: { pitch, duration, ... }
 * @returns {Object} - Result: { keyName, rootIndex, isMinor, confidence }
 */
export function detectKey(notes) {
  if (!notes || notes.length === 0) {
    return { keyName: "C Major", rootIndex: 0, isMinor: false, confidence: 0 };
  }

  // 1. Build pitch-class duration profile (12 elements)
  const durationProfile = Array(12).fill(0);
  notes.forEach(note => {
    const pitchClass = note.pitch % 12;
    // We weight by duration and a little bit by velocity (loudness) if present
    const weight = note.duration * (note.velocity || 1);
    durationProfile[pitchClass] += weight;
  });

  // Check if profile is empty (no notes have duration)
  const totalDuration = durationProfile.reduce((a, b) => a + b, 0);
  if (totalDuration === 0) {
    return { keyName: "C Major", rootIndex: 0, isMinor: false, confidence: 0 };
  }

  let bestKeyName = "C Major";
  let bestRoot = 0;
  let bestIsMinor = false;
  let highestCorrelation = -Infinity;

  // 2. Correlation test for 12 Major and 12 Minor keys
  for (let root = 0; root < 12; root++) {
    // Rotate profiles relative to root
    const rotatedMajor = [];
    const rotatedMinor = [];
    for (let i = 0; i < 12; i++) {
      rotatedMajor.push(MAJOR_PROFILE[(i - root + 12) % 12]);
      rotatedMinor.push(MINOR_PROFILE[(i - root + 12) % 12]);
    }

    // Pearson Correlation
    const corrMajor = pearsonCorrelation(durationProfile, rotatedMajor);
    const corrMinor = pearsonCorrelation(durationProfile, rotatedMinor);

    if (corrMajor > highestCorrelation) {
      highestCorrelation = corrMajor;
      bestRoot = root;
      bestIsMinor = false;
      bestKeyName = `${PITCH_NAMES[root]} Major`;
    }
    
    if (corrMinor > highestCorrelation) {
      highestCorrelation = corrMinor;
      bestRoot = root;
      bestIsMinor = true;
      bestKeyName = `${PITCH_NAMES[root]} Minor`;
    }
  }

  return {
    keyName: bestKeyName,
    rootIndex: bestRoot,
    isMinor: bestIsMinor,
    confidence: highestCorrelation
  };
}
