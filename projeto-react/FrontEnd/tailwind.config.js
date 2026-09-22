/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        luxury: {
          bg: '#0B0F17',
          card: '#111827',
          border: 'rgba(212, 175, 55, 0.15)',
          gold: '#D4AF37',
          goldDark: '#9A7B1C',
          goldGlow: 'rgba(212, 175, 55, 0.25)',
        }
      }
    },
  },
  plugins: [],
}
