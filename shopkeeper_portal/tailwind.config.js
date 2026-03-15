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
        background: "#f2eee9",
        primary: {
          DEFAULT: "#e34a27",
          light: "#f9d8d1",
        },
        secondary: {
          DEFAULT: "#1e352f",
        },
        accent: {
          DEFAULT: "#f4b942",
        },
        surface: "#FFFFFF",
      },
      fontFamily: {
        heading: ["var(--font-syne)", "sans-serif"],
        body: ["var(--font-space-mono)", "monospace"],
      },
      boxShadow: {
        'brutal': '4px 4px 0px #1e352f',
        'brutal-lg': '8px 8px 0px #1e352f',
        'brutal-sm': '2px 2px 0px #1e352f',
      }
    },
  },
  plugins: [],
};
