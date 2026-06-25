import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#070707",
        leaf: "#151515",
        mint: "#f3f3f1",
        saffron: "#ff7a1a",
        masala: "#e45312",
        rose: "#fff0e6",
        ivory: "#ffffff",
        cream: "#f5f4f0",
        charcoal: "#1b1b1b",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-body)", "sans-serif"],
      },
      boxShadow: {
        soft: "0 24px 80px rgba(7, 7, 7, 0.12)",
        lift: "0 22px 44px rgba(255, 122, 26, 0.24)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.65)",
      },
      borderRadius: {
        button: "0.5rem",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        30: "7.5rem",
      },
      backgroundImage: {
        grain:
          "radial-gradient(circle at 1px 1px, rgba(7,7,7,0.08) 1px, transparent 0)",
        "section-wash":
          "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(255,240,230,0.72))",
      },
    },
  },
  plugins: [],
};

export default config;
