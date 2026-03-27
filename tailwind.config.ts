import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 古风色调 - Ancient Chinese color palette
        ink: {
          50: "#faf8f5",
          100: "#f0ebe0",
          200: "#ddd4c0",
          300: "#c4b49a",
          400: "#a89070",
          500: "#8b7355",
          600: "#6e5a41",
          700: "#52432f",
          800: "#382e1f",
          900: "#1e1810",
        },
        cinnabar: {
          50: "#fff5f5",
          100: "#ffe0e0",
          200: "#ffc0c0",
          300: "#ff9090",
          400: "#f85050",
          500: "#e63030",
          600: "#c01818",
          700: "#9a0808",
          800: "#7a0000",
          900: "#5a0000",
        },
        jade: {
          50: "#f0faf4",
          100: "#d4f0e0",
          200: "#a8e0c4",
          300: "#70c8a0",
          400: "#38ac78",
          500: "#1a9060",
          600: "#0a7248",
          700: "#005538",
          800: "#003a28",
          900: "#001f18",
        },
        parchment: {
          50: "#fdfcf8",
          100: "#faf6ec",
          200: "#f3ecd4",
          300: "#e8dbb8",
          400: "#d9c490",
          500: "#c8a860",
          600: "#b08840",
          700: "#8a6828",
          800: "#644c18",
          900: "#3e3008",
        },
      },
      fontFamily: {
        serif: ["Noto Serif SC", "SimSun", "serif"],
        sans: ["Noto Sans SC", "PingFang SC", "sans-serif"],
      },
      backgroundImage: {
        "parchment-texture": "url('/textures/parchment.png')",
      },
    },
  },
  plugins: [],
};

export default config;
