/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        inter: ['Inter', 'sans-serif'],
      },
      colors: {
        goblin: {
          bg:      '#0a0a0c',
          surface: '#111115',
          panel:   '#16161c',
          border:  '#2a2a35',
          accent:  '#7c5cbf',
          gold:    '#c9a84c',
          text:    '#e8e6f0',
          muted:   '#6b6880',
          danger:  '#c94c4c',
          success: '#4caf7d',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
