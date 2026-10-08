export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F2F6FB",
          100: "#E1EAF5",
          200: "#C3D3E8",
          300: "#93AED3",
          400: "#5F84B8",
          500: "#3D63A0",
          600: "#2C4C84",
          700: "#1E3A6B",
          800: "#152A52",
          900: "#0C1A36",
        },
        gold: {
          100: "#FBF0D6",
          400: "#E2B54A",
          500: "#C8962E",
          600: "#A3761D",
        },
        cream: "#F6F7FB",
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
