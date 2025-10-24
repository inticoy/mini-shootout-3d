/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx,html}'
  ],
  theme: {
    extend: {
      fontFamily: {
        russo: ['"Russo One"', 'sans-serif']
      },
      screens: {
        'xs-height': { 'raw': '(max-height: 550px)' },
        'landscape-xs': { 'raw': '(orientation: landscape) and (max-height: 550px)' }
      },
      keyframes: {
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        shine: {
          '0%': { left: '-100%' },
          '50%': { left: '100%' },
          '100%': { left: '100%' }
        }
      },
      animation: {
        'fade-in-down': 'fadeInDown 0.8s ease-out',
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        'fade-in': 'fadeIn 1s ease-out both',
        'fade-in-delayed': 'fadeIn 1s ease-out 0.5s both',
        shine: 'shine 2s linear infinite'
      }
    }
  },
  plugins: []
};
