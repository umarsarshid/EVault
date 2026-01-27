module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sand: {
          50: '#fdfaf4',
          100: '#f6f1e7',
          200: '#e8ddcc',
          300: '#d6c5ae',
          400: '#bfa98c',
          500: '#a0896d',
          600: '#836c55',
          700: '#6f5a48',
          800: '#4a3b2f',
          900: '#24160f',
        },
      },
      boxShadow: {
        soft: '0 24px 60px rgba(17, 24, 39, 0.12)',
      },
    },
  },
  plugins: [],
}
