import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f1f8f9",
          100: "#d7ecef",
          200: "#afd8de",
          300: "#79bec9",
          400: "#4ca2b2",
          500: "#338696",
          600: "#2e6f7f",
          700: "#295c69",
          800: "#264c56",
          900: "#243f48"
        },
        cheque: "#d4b06a"
      },
      boxShadow: {
        soft: "0 12px 30px rgba(22, 34, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
