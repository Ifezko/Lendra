/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0A0A0F',
          accent: '#EC81FF',
          accentDark: '#B84FCC',
          accentLight: '#F5B8FF',
          card: '#12121A',
          cardHover: '#1A1A25',
          border: '#1E1E2A',
          text: '#E0E0E8',
          muted: '#ADADB5',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
