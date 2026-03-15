import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        plutus: {
          bg: "#1A1A1B",
          surface: "#2A2A2B",
          "surface-light": "#3A3A3B",
          gold: "#FFD700",
          "gold-dim": "#B8960F",
          positive: "#22C55E",
          negative: "#EF4444",
          sale: "#F59E0B",
          "text-primary": "#FAFAFA",
          "text-secondary": "#A0A0A0",
          border: "#3A3A3B",
        },
      },
      fontFamily: {
        sans: ["Inter", "Geist Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
