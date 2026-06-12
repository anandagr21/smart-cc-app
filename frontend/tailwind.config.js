/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./features/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#F8F8FC',
        surface: '#FFFFFF',
        surfaceElevated: '#FFFFFF',
        primary: '#4F36FF',
        accent: '#FF8A3D',
        accentGlow: 'rgba(255, 138, 61, 0.15)',
        textPrimary: '#14142B',
        textSecondary: '#666A80',
        textMuted: '#A7B0C0',
        border: '#E7E8F0',
        borderHighlight: 'rgba(20, 20, 43, 0.08)',
      }
    },
  },
  plugins: [],
}
