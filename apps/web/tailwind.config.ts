import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Saffron — our new primary
        brand: {
          50:  '#fff8eb',
          100: '#ffeac4',
          200: '#ffd486',
          300: '#ffba47',
          400: '#ffa31f',
          500: '#f78c05',
          600: '#db6f00',
          700: '#b25204',
          800: '#90400b',
          900: '#76350d',
        },
        // Deep teal — secondary accent for trust, freshness
        teal: {
          50:  '#effaf8',
          100: '#d8f1ed',
          200: '#b3e3db',
          300: '#82cdc4',
          400: '#4eada4',
          500: '#2f8e87',
          600: '#23726e',
          700: '#1f5b58',
          800: '#1d4a48',
          900: '#1a3e3d',
        },
        // Forest — confirmations / sustainability
        forest: {
          50:  '#f1fae9',
          100: '#dff3cd',
          200: '#c2e7a4',
          300: '#9ed471',
          400: '#7cbf4a',
          500: '#5ea330',
          600: '#487f23',
          700: '#39651e',
          800: '#30511d',
          900: '#2a451c',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto'],
        display: ['ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        soft: '0 4px 24px rgba(15, 23, 42, 0.06)',
        glow: '0 8px 32px rgba(247, 140, 5, 0.18)',
      },
      backgroundImage: {
        'brand-gradient':
          'linear-gradient(135deg, #f78c05 0%, #db6f00 45%, #b25204 100%)',
        'hero-glow':
          'radial-gradient(80% 60% at 30% 20%, #ffeac4 0%, #fff8eb 40%, #ffffff 80%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
