import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: "#1B3A6E",
        "brand-dark": "#0F2447",
        "brand-bright": "#00B4F0",
        "brand-light": "#EAF8FF",
        "brand-sky": "#00B4F0",
        accent: "#FF3D9A",
        "accent-hot": "#FF3D9A",
        "accent-light": "#FFE0F0",
        "pink-brand": "#FF6BAA",
        cream: "#F7F3ED",
        "section-gray": "#F4F4F4",
      },
      fontFamily: {
        sans: ["var(--font-quicksand)", "Quicksand", "system-ui", "sans-serif"],
        script: ["var(--font-caveat)", "Caveat", "cursive"],
      },
      borderRadius: {
        zoomin: "80px 0 80px 0",
        sticker: "20px",
      },
    },
  },
  plugins: [],
  safelist: [
    "van-slot-shade-1",
    "van-slot-shade-2",
    "van-slot-shade-3",
    "van-slot-shade-4",
  ],
};

export default config;
