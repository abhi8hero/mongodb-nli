/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        mongoGreen: "#00ED64",
        mongoDark: "#0E1117",
        mongoCard: "#161B22",
        mongoBorder: "#2A2F3A",
      },
    },
  },
  plugins: [],
}