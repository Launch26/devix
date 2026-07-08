/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: "#03040A",
          deep: "#070B14",
          mid: "#0A1020",
          panel: "rgba(7, 11, 20, 0.75)",
        },
        neon: {
          cyan: "#00E5FF",
          blue: "#3B82F6",
          emerald: "#00FFB3",
          purple: "#8B5CF6",
          orange: "#FF9F43",
          crimson: "#EF4444",
        },
      },
      fontFamily: {
        heading: ["Outfit", "Inter", "sans-serif"],
        ui: ["Inter", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        card: "18px",
        btn: "12px",
        input: "10px",
      },
      boxShadow: {
        "glow-cyan":
          "0 0 20px rgba(0,229,255,0.15), 0 0 60px rgba(0,229,255,0.05)",
        "glow-cyan-lg":
          "0 0 40px rgba(0,229,255,0.25), 0 0 100px rgba(0,229,255,0.08)",
        "glow-purple":
          "0 0 20px rgba(139,92,246,0.2), 0 0 60px rgba(139,92,246,0.08)",
        "glow-purple-lg":
          "0 0 40px rgba(139,92,246,0.35), 0 0 100px rgba(139,92,246,0.12)",
        "glow-emerald":
          "0 0 20px rgba(0,255,179,0.15), 0 0 60px rgba(0,255,179,0.05)",
        "glow-crimson":
          "0 0 20px rgba(239,68,68,0.2), 0 0 60px rgba(239,68,68,0.08)",
        "glow-orange":
          "0 0 20px rgba(255,159,67,0.15), 0 0 60px rgba(255,159,67,0.05)",
        card: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)",
        "card-hover":
          "0 16px 48px rgba(0,0,0,0.6), 0 0 30px rgba(0,229,255,0.06), inset 0 1px 0 rgba(255,255,255,0.05)",
      },
      animation: {
        "pulse-glow": "pulse-glow 2.5s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
        "scan-line": "scan-line 4s linear infinite",
        "spin-slow": "spin 8s linear infinite",
        "fade-in": "fade-in 0.6s ease-out",
        "slide-up": "slide-up 0.5s ease-out",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      backgroundImage: {
        "gradient-space":
          "radial-gradient(ellipse at 20% 20%, rgba(139,92,246,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(0,229,255,0.04) 0%, transparent 50%)",
      },
    },
  },
  plugins: [],
};
