/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#ecfeff', 100: '#cffafe', 600: '#0e7490', 700: '#155e75', 900: '#0f2a43' },
        gold: { 50: '#fffbeb', 100: '#fef3c7', 500: '#f59e0b', 700: '#b45309' },
      },
    },
  },
  plugins: [],
}
