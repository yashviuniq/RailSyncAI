/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rail: {
          navy: "#0f172a",
          blue: "#1e40af",
          accent: "#f97316",
          bg: "#f1f5f9",
        },
      },
    },
  },
  plugins: [],
}
