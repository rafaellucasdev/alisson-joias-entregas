import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Acento dourado (joalheria)
        brand: {
          DEFAULT: "#d97706",
          dark: "#b45309",
          light: "#fbbf24",
        },
      },
    },
  },
  plugins: [],
};

export default config;
