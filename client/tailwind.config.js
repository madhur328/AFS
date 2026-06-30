/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forge: {
          bg: '#050508',
          panel: '#0c0e14',
          border: '#1a2030',
          cyan: '#00e5ff',
          gold: '#d4a853',
          ember: '#ff4d2e',
          leaf: '#c41e3a',
          violet: '#7c5cff',
          muted: '#6b7a90',
        },
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 30px rgba(0, 229, 255, 0.15)',
        ember: '0 0 40px rgba(255, 77, 46, 0.2)',
        leaf: '0 0 25px rgba(196, 30, 58, 0.25)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
};