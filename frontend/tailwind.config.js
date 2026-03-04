/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // VS Code Dark+ inspired
        bg: {
          primary: '#0d0d0d',
          secondary: '#141414',
          tertiary: '#1a1a1a',
          panel: '#111111',
          hover: '#1e1e1e',
          active: '#252525',
          border: '#2a2a2a',
        },
        accent: {
          primary: '#7c5cfc',
          secondary: '#5c8afc',
          success: '#22c55e',
          warning: '#f59e0b',
          danger: '#ef4444',
          info: '#06b6d4',
          glow: '#7c5cfc33',
        },
        text: {
          primary: '#f0f0f0',
          secondary: '#a0a0a0',
          muted: '#606060',
          disabled: '#404040',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-up': 'slideInUp 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
        'typing': 'typing 1.2s steps(3, end) infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideInRight: { from: { opacity: '0', transform: 'translateX(20px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        slideInUp: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseGlow: { '0%, 100%': { boxShadow: '0 0 0 0 #7c5cfc44' }, '50%': { boxShadow: '0 0 20px 4px #7c5cfc44' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        typing: { '0%, 100%': { content: "'...'" }, '33%': { content: "'.'" }, '66%': { content: "'..'" } },
      },
      boxShadow: {
        'panel': '0 0 0 1px #2a2a2a',
        'glow-sm': '0 0 10px #7c5cfc33',
        'glow-md': '0 0 20px #7c5cfc44',
        'glow-lg': '0 0 40px #7c5cfc55',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern': 'linear-gradient(#1a1a1a 1px, transparent 1px), linear-gradient(90deg, #1a1a1a 1px, transparent 1px)',
      }
    },
  },
  plugins: [],
}
