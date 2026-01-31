module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sand: {
          50: '#f7f8fb',
          100: '#f0f1f5',
          200: '#e2e4ec',
          300: '#d0d4e2',
          400: '#b7bdd7',
          500: '#9aa6c9',
          600: '#7684b5',
          700: '#54629f',
          800: '#2f3d8b',
          900: '#102364',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Serif"', 'serif'],
        display: ['"IBM Plex Serif"', '"Space Grotesk"', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        soft: '0 24px 60px rgba(15, 23, 42, 0.14)',
        lift: '0 20px 40px rgba(15, 23, 42, 0.18)',
      },
    },
  },
  plugins: [],
}
