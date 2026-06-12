/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#080812',
          soft: '#0F0F1E',
          muted: '#1A1A2E',
          border: '#252540',
        },
        brand: {
          50: '#F0EBFF',
          100: '#E0D5FF',
          200: '#C2AAFF',
          300: '#A07EFF',
          400: '#7C52F5',
          500: '#6B3EE8',
          600: '#5A2FCC',
          700: '#4722A8',
        },
        spark: {
          DEFAULT: '#F59E0B',
          soft: '#FCD34D',
        },
        success: '#10B981',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter var', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 80px -10px rgba(107, 62, 232, 0.5)',
        'glow-sm': '0 0 30px -5px rgba(107, 62, 232, 0.3)',
        card: '0 25px 60px -20px rgba(0,0,0,0.7)',
        'card-hover': '0 30px 70px -15px rgba(107, 62, 232, 0.25)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #6B3EE8 0%, #A07EFF 100%)',
        'gradient-hero': 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(107,62,232,0.25) 0%, transparent 70%)',
        'gradient-card': 'linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-in': { '0%': { opacity: '0', transform: 'translateX(-12px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        pulse: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        'fade-up-delay': 'fade-up 0.5s 0.15s ease-out both',
        'fade-up-delay-2': 'fade-up 0.5s 0.3s ease-out both',
        'fade-in': 'fade-in 0.4s ease-out both',
        'slide-in': 'slide-in 0.4s ease-out both',
        float: 'float 5s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
};
