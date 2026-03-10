/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Sora", "sans-serif"],
        body: ["Space Grotesk", "sans-serif"]
      },
      colors: {
        dashboard: {
          bg: "#030712",
          panel: "#111827",
          panelSoft: "#1f2937",
          border: "#334155",
          positive: "#22c55e",
          negative: "#ef4444",
          muted: "#94a3b8",
          accent: "#06b6d4"
        }
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(6, 182, 212, 0.2), 0 14px 28px rgba(2, 6, 23, 0.6)"
      },
      animation: {
        pulseUp: "pulseUp 0.8s ease-out",
        pulseDown: "pulseDown 0.8s ease-out",
        popIn: "popIn 0.4s ease-out"
      },
      keyframes: {
        pulseUp: {
          "0%": { backgroundColor: "rgba(34, 197, 94, 0.35)" },
          "100%": { backgroundColor: "rgba(17, 24, 39, 0)" }
        },
        pulseDown: {
          "0%": { backgroundColor: "rgba(239, 68, 68, 0.32)" },
          "100%": { backgroundColor: "rgba(17, 24, 39, 0)" }
        },
        popIn: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0px)", opacity: "1" }
        }
      }
    }
  },
  plugins: []
};
