/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      colors: {
        google: {
          blue: "#1a73e8",
          "blue-dark": "#1967d2",
          "blue-light": "#e8f0fe",
          red: "#ea4335",
          "red-dark": "#d93025",
          "red-light": "#fce8e6",
          yellow: "#f9ab00",
          "yellow-bright": "#fbbc04",
          "yellow-light": "#fef7e0",
          green: "#34a853",
          "green-dark": "#188038",
          "green-light": "#e6f4ea",
          ink: "#202124",
          gray: "#5f6368",
          muted: "#80868b",
          line: "#dadce0",
          softline: "#e8eaed",
          bg: "#f8f9fa",
          white: "#ffffff",
        },
      },
    },
  },
  plugins: [],
}