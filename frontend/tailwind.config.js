/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./features/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#0F0F13',
        card: '#1C1C21',
        primary: '#3B82F6',
        accent: '#10B981',
        textPrimary: '#FFFFFF',
        textSecondary: '#9CA3AF'
      }
    },
  },
  plugins: [],
}
