# 🎵 MIDI & MusicXML Multi-Notation Transposer Studio

A modern, client-side, serverless web application that allows users to upload standard musical score files (`.mid`, `.musicxml`, or `.xml`), isolate the main melody track, and instantly transpose and convert notes into highly readable notation formats.

Live Demo: **[Midi-to-multi-Notation Live Site](https://rudraksh-patel.github.io/Midi-to-multi-Notation/)**

---

## ✨ Key Features

*   **📤 File Parsing**: Drag-and-drop support for Standard MIDI (`.mid`) and MusicXML (`.xml`/`.musicxml`) files.
*   **🧠 Skyline Melody Isolation**: Automatically isolates the main vocal/instrument melody line from multi-track or polyphonic files using a custom skyline overlap-removal algorithm.
*   **🎼 Multi-Notation Outputs**:
    *   **Scientific Pitch Notation (SPN)**: Standard Western notes with sharp-only formatting (e.g., `C4`, `D#5`, `F5`).
    *   **Indian Classical Sargam**: Align notes relative to a base "Sa" pitch class (`S`, `r`, `R`, `g`, `G`, `m`, `M`, `P`, `d`, `D`, `n`, `N`), featuring lower octave indicators, higher octave quote suffixes (e.g., `S'`), and Komal qualifiers.
*   **🎻 Interactive Violin Hero**: A stunning GSAP-animated SVG violin canvas. Hovering over the strings bends and plucks them, triggering responsive audio. Falling MIDI note blocks transform into floating letter notes as they cross the strings.
*   **🎹 Interactive SVG Piano Roll**: Visualizes harmony tracks in the background while highlighting the active melody track in a vibrant gradient. Supports clicking anywhere on the grid to seek audio playback.
*   **🔊 Studio-Grade Audio Synthesis**: Built on **Tone.js**, featuring synthesized timbres (Piano, Flute/Bansuri, Sawtooth, Woodwind) routed through a custom effects chain (Reverb, Feedback Delay, and custom Vibrato to mimic lip/jaw flutter).
*   **🖨️ PDF & Print Customizer**: Print-friendly sheets with options to adjust typography, padding, margins, and headers.
*   **📲 Progressive Web App (PWA)**: Registerable service worker for full offline loading capability.

---

## 🛠️ Technology Stack

*   **Framework**: [React 19](https://react.dev/) + [Vite](https://vite.dev/)
*   **Audio Engine**: [Tone.js](https://tonejs.github.io/) (Web Audio API)
*   **Animation**: [GSAP](https://gsap.com/) (GreenSock Animation Platform)
*   **Styling**: CSS Custom Variables (Design system: Warm Beige and Charcoal Plum Theme) + TailwindCSS
*   **Local Storage**: Dexie.js (IndexedDB wrapper)
*   **Icons**: Lucide React

---

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js (version 18 or above) installed.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Rudraksh-patel/Midi-to-multi-Notation.git
   cd Midi-to-multi-Notation
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

---

## 📐 Architecture & Key Utilities

*   **Melody Isolation (`skylineFilter.js`)**: Sorts notes chronologically, resolves timing overlaps, and keeps only the highest notes to construct a single, readable melody line.
*   **Key Signature Detection (`keyDetector.js`)**: Implements the **Krumhansl-Schmuckler** algorithm using Krumhansl-Kessler Major/Minor pitch profile vectors to automatically determine the song's original musical key signature.
*   **Beat Formatting (`notationEngines.js`)**: Breaks notes into logical lines based on silence durations, groups them into rhythmic beats, and inserts trailing dashes (e.g., `Sa - -`) to denote held sustain intervals.

---
