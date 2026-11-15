/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        midnight: {
          950: '#050811',
          900: '#090E1A',
          850: '#0D1322',
          800: '#111827',
          700: '#1E293B',
          600: '#334155',
        },
        indigo: {
          950: '#1E1B4B',
          900: '#312E81',
          600: '#4F46E5',
          500: '#6366F1',
          400: '#818CF8',
        },
        gold: {
          600: '#B48A1E',
          500: '#D4AF37',
          400: '#E5C158',
          300: '#F3DC8A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-indigo': '0 0 25px -5px rgba(99, 102, 241, 0.25)',
        'glow-gold': '0 0 20px -4px rgba(212, 175, 55, 0.28)',
      },
    },
  },
  plugins: [],
};

