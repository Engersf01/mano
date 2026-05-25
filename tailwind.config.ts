import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          800: "#0d1020",
          900: "#070815",
          950: "#03040c",
        },
        aurora: {
          cyan: "#60f5ff",
          violet: "#a570ff",
          pink: "#ff63d4",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        flashIn: {
          "0%": { opacity: "0", transform: "scale(0.8)" },
          "15%": { opacity: "1", transform: "scale(1.05)" },
          "100%": { opacity: "0", transform: "scale(1)" },
        },
      },
      animation: {
        flashIn: "flashIn 600ms ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
