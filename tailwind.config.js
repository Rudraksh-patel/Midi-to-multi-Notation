/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#0b0f19",
        violetGlow: "#8b5cf6",
        emeraldGlow: "#10b981",
      },
      fontFamily: {
        sans: ["'Outfit'", "'Plus Jakarta Sans'", "sans-serif"],
        mono: ["'Fira Code'", "monospace"],
      }
    },
  },
  plugins: [],
}
