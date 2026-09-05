/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#1F2025',
        card: '#2A2D35',
        accent: {
          DEFAULT: '#55E6C1',
          hover: '#6feccd',
          active: '#3ecfaa'
        },
        muted: '#8A8F9C',
        line: '#3A3E48'
      },
      borderRadius: {
        card: '18px'
      },
      transitionDuration: {
        DEFAULT: '300ms'
      },
      boxShadow: {
        card: '0 8px 24px rgba(0, 0, 0, 0.35)',
        'card-hover': '0 12px 32px rgba(0, 0, 0, 0.45)'
      }
    }
  },
  plugins: []
}
