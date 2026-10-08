export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#FBF6F1",
          100: "#F4E8DC",
          200: "#E6CDB4",
          300: "#D1A884",
          400: "#B57D55",
          500: "#94592F",
          600: "#7A4521",
          700: "#5B2E14",
          800: "#43210E",
          900: "#2C1509",
        },
        gold: {
          100: "#FBF0D6",
          400: "#E2B54A",
          500: "#C8962E",
          600: "#A3761D",
        },
        cream: "#FBF7F1",
      },
      fontFamily: {
        display: ["Sora", "sans-serif"],
        body: ["Manrope", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
