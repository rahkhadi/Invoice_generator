import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#111827",
        steel: "#27364a",
        safety: "#f97316"
      }
    }
  },
  plugins: []
};

export default config;
