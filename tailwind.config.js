/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        aura: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        dark: {
          950: '#07080d',
          900: '#0c0e17',
          850: '#111422',
          800: '#161a2b',
          750: '#1c2137',
          700: '#242a44',
          600: '#32395b',
          500: '#48517c',
          400: '#6b77a7',
          300: '#9aa5ce',
          200: '#c8d0e7',
          100: '#eef1f8',
        },
      },
      boxShadow: {
        glow: '0 0 20px -3px rgba(139, 92, 246, 0.45)',
        'glow-lg': '0 0 35px -5px rgba(139, 92, 246, 0.6)',
        'glow-cyan': '0 0 20px -3px rgba(6, 182, 212, 0.45)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
      },
    },
  },
  plugins: [],
};

