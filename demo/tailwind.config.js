/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        bg: {
          primary: '#111111',
          surface: '#1A1A2E',
          elevated: '#1E1E38',
          sidebar: '#0E0E1C',
        },
        accent: {
          purple: '#7C3AED',
          'purple-light': '#8B5CF6',
          'purple-dim': '#3B1F7A',
          green: '#059669',
          'green-light': '#10B981',
          'green-dim': '#064E3B',
          red: '#DC2626',
          'red-light': '#EF4444',
          'red-dim': '#7F1D1D',
          amber: '#D97706',
          'amber-light': '#F59E0B',
          'amber-dim': '#78350F',
          blue: '#2563EB',
          'blue-dim': '#1E3A8A',
        },
        border: {
          default: '#2D2D4A',
          subtle: '#1F1F35',
          strong: '#3D3D60',
        },
        text: {
          primary: '#F1F5F9',
          secondary: '#94A3B8',
          muted: '#64748B',
          inverse: '#0F172A',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
