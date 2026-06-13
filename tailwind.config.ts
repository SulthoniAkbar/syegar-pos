import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18201c",
        leaf: "#2f7d4f",
        lime: "#c7de54",
        mango: "#f7b733",
        guava: "#e85d75",
        skysoft: "#e9f4f7"
      },
      boxShadow: {
        soft: "0 14px 40px rgba(24, 32, 28, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
