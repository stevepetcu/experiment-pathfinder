/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.tsx',
  ],
  theme: {
    extend: {
      fontFamily: {
        'vt323': ['VT323', 'serif'],
      },
      animation: {
        'pulse-fast': 'pulse-fast 1s steps(1, end) infinite',
      },
      keyframes: {
        'pulse-fast': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.1 },
        },
      },
    },
  },
  plugins: [],
};

