/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: "#E7C98A",
        gold2: "#F8E7C0",
        ink: "#120E0B",
        cream: "#F6EFE2",
        dusk: "#1A140F",
      },
      fontFamily: {
        display: ["Cormorant Garamond", "serif"],
        sans: ["Manrope", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 32px rgba(231, 201, 138, 0.35)",
      },
    },
  },
  plugins: [],
};
