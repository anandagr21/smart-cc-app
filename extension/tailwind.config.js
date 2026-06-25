/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{tsx,html}"],
  darkMode: "media",
  prefix: "plasmo-",
  theme: {
    extend: {
      colors: {
        // ── Matches Expo app theme/colors.ts exactly ──
        primary: "#4F36FF",
        "primary-dark": "#3322D1",
        "primary-soft": "#EDEAFF",
        accent: "#FF8A3D",
        "accent-soft": "#FFB545",
        // Backgrounds
        background: "#F8F8FC",
        surface: "#FFFFFF",
        "surface-elevated": "#FFFFFF",
        // Glass (approximate for web)
        "glass-surface": "rgba(255, 255, 255, 0.80)",
        "glass-border": "rgba(231, 232, 240, 0.70)",
        "glass-highlight": "rgba(255, 255, 255, 0.90)",
        // Semantic
        success: "#22C55E",
        "success-soft": "rgba(34, 197, 94, 0.12)",
        warning: "#F59E0B",
        "warning-soft": "rgba(245, 158, 11, 0.12)",
        danger: "#EF4444",
        "danger-soft": "rgba(239, 68, 68, 0.10)",
        // Typography
        "text-hero": "#14142B",
        "text-primary": "#14142B",
        "text-secondary": "#666A80",
        "text-muted": "#6B7280",
        // Borders
        border: "#E7E8F0",
        "border-highlight": "rgba(20, 20, 43, 0.08)",
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', "sans-serif"],
      },
      borderRadius: {
        xs: "6px",
        sm: "10px",
        md: "16px",
        lg: "20px",
        card: "24px",
        sheet: "32px",
        xl: "28px",
        full: "9999px",
      },
      fontSize: {
        micro: ["9px", { lineHeight: "12px" }],
        caption: ["11px", { lineHeight: "14px" }],
        label: ["12px", { lineHeight: "16px" }],
        "body-sm": ["12px", { lineHeight: "18px" }],
        body: ["14px", { lineHeight: "20px" }],
        "body-lg": ["16px", { lineHeight: "24px" }],
        title: ["18px", { lineHeight: "24px" }],
        headline: ["22px", { lineHeight: "28px" }],
        display: ["32px", { lineHeight: "40px" }],
        hero: ["48px", { lineHeight: "52px" }],
      },
      letterSpacing: {
        tightest: "-1.5px",
        tight: "-0.5px",
        normal: "0",
        wide: "0.5px",
        wider: "1px",
        widest: "2px",
      },
    },
  },
}
