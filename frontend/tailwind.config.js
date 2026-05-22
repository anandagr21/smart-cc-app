/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./features/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#09090B',
        surface: '#18181B',
        surfaceElevated: '#27272A',
        primary: '#10B981',
        accent: '#10B981',
        accentGlow: 'rgba(16, 185, 129, 0.15)',
        textPrimary: '#FFFFFF',
        textSecondary: '#A1A1AA',
        textMuted: '#71717A',
        border: '#27272A',
        borderHighlight: '#3F3F46',
      }
    },
  },
  plugins: [],
}
