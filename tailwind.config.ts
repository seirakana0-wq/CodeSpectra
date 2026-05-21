import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0a0f',
        bone: '#f0f0f5',
        slab: 'rgba(255, 255, 255, 0.03)',
        wire: 'rgba(255, 255, 255, 0.06)',
        ash: 'rgba(255, 255, 255, 0.4)',
        acid: '#8b5cf6',
        blood: '#ef4444',
        plasma: '#34d399',
        flare: '#f59e0b',
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.05)',
          border: 'rgba(255, 255, 255, 0.08)',
          hover: 'rgba(255, 255, 255, 0.08)',
          active: 'rgba(255, 255, 255, 0.12)',
        },
        accent: {
          DEFAULT: '#8b5cf6',
          light: '#a78bfa',
          dim: 'rgba(139, 92, 246, 0.15)',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glass-sm': '0 4px 16px rgba(0, 0, 0, 0.2)',
        'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.4)',
        glow: '0 0 30px rgba(139, 92, 246, 0.15)',
        'glow-sm': '0 0 15px rgba(139, 92, 246, 0.1)',
      },
      backdropBlur: {
        glass: '20px',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'slide-down': 'slideDown 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.4s ease-out forwards',
        float: 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        blink: 'blink 1s step-start infinite',
        shimmer: 'shimmer 2s linear infinite',
        'aurora-shift': 'auroraShift 15s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        blink: {
          '50%': { opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        auroraShift: {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '50%': { transform: 'rotate(180deg) scale(1.1)' },
          '100%': { transform: 'rotate(360deg) scale(1)' },
        },
      },
      transitionTimingFunction: {
        glass: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
