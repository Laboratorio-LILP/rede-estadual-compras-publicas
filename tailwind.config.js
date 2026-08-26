/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Vermelho institucional do Governo de SP: #ED1C24 (Pantone 485 C),
        // fiel ao manual da marca. Antes era #FF161F, mais saturado que o
        // padrao GESP. Os tons 600/700 derivam do 500 nas mesmas proporcoes
        // que a escala anterior usava.
        red: {
          500: '#ED1C24',
          600: '#BE161D',
          700: '#931116',
        },
        gov: {
          red:        '#ED1C24',
          blue:       '#034EA2',
          navy:       '#233254',
          'blue-mid': '#4297D3',
          'blue-light':'#62C9E0',
          green:      '#0B9247',
          olive:      '#94AA5A',
          black:      '#1D1D1B',
          bar:        '#1a1a1a',
          gray:       '#F8F9FB',
          'gray-mid': '#E8EAF0',
          'gray-dark':'#808080',
        },
      },
      fontFamily: {
        sans:        ['Verdana', 'Geneva', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'sans-serif'],
        montserrat:  ['Montserrat', 'Verdana', 'sans-serif'],
      },
      boxShadow: {
        'card':       '0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.07)',
      },
    },
  },
  plugins: [],
};
