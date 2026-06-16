import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Barkbus uses a bright sky blue (~#6BBDE8). This palette is slightly darker.
        blue: {
          DEFAULT: "#0A2E44",
          50: "#6A9BB5",
          100: "#5289A5",
          200: "#3D7794",
          300: "#2E6683",
          400: "#1F5572",
          500: "#0A2E44",
          600: "#082234",
          700: "#061A28",
          800: "#04141E",
          900: "#020C12",
          barkbus: "#6BBDE8",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
