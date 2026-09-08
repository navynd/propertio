/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    screens: {
      sm: "640px",
      "max-sm": { max: "639px" },
      md: "768px",
      lg: "1024px",
      "2xl": "1400px",
    },
    container: {
      center: true,
      padding: "2rem",
    },
    extend: {
      fontFamily: {
        "regular": ["Regular"],
        "medium": ["Medium"],
        "semibold": ["SemiBold"],
        "bold": ["Bold"],
        "extrabold": ["ExtraBold"],
      },
      opacity: {
        '10': '0.1',
        '20': '0.2',
        '95': '0.95',
      }
    },
  },
  plugins: [],
}
