import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        
        // Luxury Redesign Color Palette
        luxury: {
          pureBlack: "#050505",
          richBlack: "#0B0B0B",
          goldRoyal: "#D4AF37",
          goldMetallic: "#F5C542",
          blueMedical: "#007AFF",
          blueElectric: "#00BFFF",
          greenEmerald: "#10B981",
          redCrimson: "#EF4444",
          softWhite: "#F8FAFC",
        },
        
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "pulse-fast": "pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow-gold": "glowGold 2.5s infinite ease-in-out",
        "glow-blue": "glowBlue 2.5s infinite ease-in-out",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 2.5s linear infinite",
        "heartbeat": "heartbeat 1.4s ease-in-out infinite",
      },
      keyframes: {
        glowGold: {
          "0%, 100%": { boxShadow: "0 0 5px rgba(212, 175, 55, 0.15), inset 0 0 5px rgba(212, 175, 55, 0.05)" },
          "50%": { boxShadow: "0 0 15px rgba(212, 175, 55, 0.4), inset 0 0 8px rgba(212, 175, 55, 0.15)" },
        },
        glowBlue: {
          "0%, 100%": { boxShadow: "0 0 5px rgba(0, 191, 255, 0.15), inset 0 0 5px rgba(0, 191, 255, 0.05)" },
          "50%": { boxShadow: "0 0 15px rgba(0, 191, 255, 0.4), inset 0 0 8px rgba(0, 191, 255, 0.15)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        heartbeat: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.8" },
          "25%": { transform: "scale(1.08)", opacity: "1" },
          "50%": { transform: "scale(0.96)", opacity: "0.9" },
          "75%": { transform: "scale(1.04)", opacity: "1" },
        }
      },
    },
  },
  plugins: [],
};

export default config;
