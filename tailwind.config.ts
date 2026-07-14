import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // ── Hapas Premium Dark Palette ──
        hapas: {
          // Gold accent scale
          50: "#FBF7EE",
          100: "#F5ECDA",
          200: "#EBDAB5",
          300: "#DFC487",
          400: "#D4AD5C",
          500: "#C4A052", // Primary gold
          600: "#A88636",
          700: "#8B6914", // Wood accent
          800: "#6E5310",
          900: "#543F0D",
        },
        dark: {
          50: "#f5f5f5",
          100: "#e0e0e0",
          200: "#bdbdbd",
          300: "#9e9e9e",
          400: "#757575",
          500: "#616161",
          600: "#424242",
          700: "#333333",
          800: "#2D2D2D", // Anthracite – cards/panels
          900: "#1A1A1A", // Mat black – background
          950: "#121212",
        },
        cream: {
          50: "#FDFCFA",
          100: "#FAF8F4",
          200: "#F5F0E8", // Gebroken wit – primary text on dark
          300: "#E8E0D0",
          400: "#D4C9B5",
          500: "#A0978A", // Secondary text
        },
        copper: {
          400: "#CD8E54",
          500: "#B87333", // Copper accent
          600: "#9A5F2A",
        },
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-xl": ["2.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-lg": ["2rem", { lineHeight: "1.15", letterSpacing: "-0.01em" }],
        "display-md": ["1.75rem", { lineHeight: "1.2" }],
        "heading": ["1.25rem", { lineHeight: "1.3" }],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        "gold-sm": "0 1px 3px rgba(196, 160, 82, 0.15)",
        "gold-md": "0 4px 12px rgba(196, 160, 82, 0.2)",
        "gold-glow": "0 0 20px rgba(196, 160, 82, 0.15)",
        "card": "0 2px 8px rgba(0, 0, 0, 0.25)",
        "card-hover": "0 4px 16px rgba(0, 0, 0, 0.35)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "shimmer": "shimmer 2s infinite linear",
        "pulse-gold": "pulseGold 2s infinite",
        "draw-check": "drawCheck 0.4s ease-out forwards",
        "spin-slow": "spin 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseGold: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(196, 160, 82, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(196, 160, 82, 0)" },
        },
        drawCheck: {
          "0%": { strokeDashoffset: "24" },
          "100%": { strokeDashoffset: "0" },
        },
      },
      backgroundImage: {
        "shimmer-gold": "linear-gradient(90deg, transparent 0%, rgba(196,160,82,0.08) 50%, transparent 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
