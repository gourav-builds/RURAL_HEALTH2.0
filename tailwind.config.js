/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'monospace'],
      },
      colors: {
        ink: '#203239',
        brand: {
          50:  '#eff9f5',
          100: '#dbf0e7',
          200: '#b9dfd0',
          300: '#8ac7b3',
          400: '#53a98f',
          500: '#278a72',
          600: '#18715e',
          700: '#165b4d',
          800: '#164a40',
          900: '#163e36',
          950: '#092b24',
        },
        surface: {
          DEFAULT: '#f6f7f5',
          card:    '#ffffff',
          cardAlt: '#f1f5f3',
          hover:   '#edf3ef',
          border:  '#e2e8e4',
          borderLight: '#d5dfd9',
        },
        status: {
          synced:   '#10b981',
          local:    '#f59e0b',
          conflict: '#ef4444',
          pending:  '#8b5cf6',
        },
      },

      animation: {
        'fade-in':   'fadeIn 0.2s ease-out',
        'slide-up':  'slideUp 0.25s ease-out',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn:   { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:  { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseDot: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
      },
    },
  },
  plugins: [
    // @tailwindcss/forms loaded dynamically
  ],
}
