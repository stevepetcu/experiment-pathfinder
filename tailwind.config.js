/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.tsx',
  ],
  theme: {
    extend: {
      fontFamily: {
        'nunito': ['nunito', 'serif'],
        'amatic': ['Amatic SC', 'serif'],
      },
    },
  },
  plugins: [],
};

