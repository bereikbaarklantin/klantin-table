import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        hapas: {
          50: "#fdf6f0",
          100: "#f9e8da",
          200: "#f2cdb0",
          300: "#e9ab7d",
          400: "#df8149",
          500: "#d76527",
          600: "#c94f1d",
          700: "#a73c1a",
          800: "#86321c",
          900: "#6d2b1a",
        },
      },
    },
  },
  plugins: [],
};
export default config;
