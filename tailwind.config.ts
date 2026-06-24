import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Design system Alisson Joalheria (espelha o ERP)
        esmeralda: {
          50: "#E8F0ED",
          100: "#C5D9D1",
          200: "#9FBFB3",
          300: "#80A795",
          400: "#4D7D6A",
          500: "#184036",
          600: "#143830",
          700: "#0F2922",
          800: "#0A1D17",
          900: "#06120E",
        },
        creme: {
          50: "#FAFAF7",
          100: "#F3EADA",
          200: "#E8DCC8",
          300: "#D4C9B0",
          400: "#BFB69A",
        },
        dourado: {
          light: "#FEDDB4",
          DEFAULT: "#DB9864",
          dark: "#C4823E",
        },
        // alias: componentes que ainda usam `brand` apontam para o dourado
        brand: {
          light: "#FEDDB4",
          DEFAULT: "#DB9864",
          dark: "#C4823E",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "Georgia", "serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
