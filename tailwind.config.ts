import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f5f7fb",
          100: "#e7eaf3",
          200: "#c9cfe0",
          300: "#9aa3bd",
          400: "#5e6685",
          500: "#3a4060",
          600: "#23273f",
          700: "#161a2e",
          800: "#0d1020",
          900: "#070815",
          950: "#03040c",
        },
        aurora: {
          cyan: "#60f5ff",
          violet: "#a570ff",
          pink: "#ff63d4",
          gold: "#ffd28a",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
      },
      backdropBlur: { "3xl": "64px" },
      boxShadow: {
        glow: "0 0 60px -10px rgba(96, 245, 255, 0.35)",
        glowViolet: "0 0 80px -10px rgba(165, 112, 255, 0.45)",
        inset1: "inset 0 1px 0 0 rgba(255, 255, 255, 0.06)",
      },
      animation: {
        float: "float 8s ease-in-out infinite",
        pulseGlow: "pulseGlow 3s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
      },
      keyframes: {
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        pulseGlow: {
          "0%,100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
