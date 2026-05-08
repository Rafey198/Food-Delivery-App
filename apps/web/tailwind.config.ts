import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff5ec',
          100: '#ffe6d1',
          200: '#ffc99e',
          300: '#ffa765',
          400: '#ff8030',
          500: '#ff6b00',
          600: '#e65900',
          700: '#bf4800',
          800: '#933700',
          900: '#702a00',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto'],
      },
      boxShadow: {
        soft: '0 4px 24px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
} satisfies Config;
