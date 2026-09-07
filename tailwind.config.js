/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brutal: {
          yellow: '#FFDE59',
          pink: '#FF6B9D',
          mint: '#00D9A5',
          blue: '#4D7CFE',
          purple: '#A78BFA',
          lime: '#B9FF66',
          orange: '#FF6B35',
          red: '#FF4D4D',
          cream: '#FFF6E9',
          paper: '#FFFDF5',
        },
      },
      fontFamily: {
        grotesk: ['"Space Grotesk"', 'sans-serif'],
        black: ['"Archivo Black"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        'brutal-xs': '2px 2px 0px 0px #000',
        'brutal-sm': '4px 4px 0px 0px #000',
        brutal: '8px 8px 0px 0px #000',
        'brutal-lg': '12px 12px 0px 0px #000',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        spinSlow: {
          to: { transform: 'rotate(360deg)' },
        },
        popIn: {
          '0%': { transform: 'scale(0) rotate(-10deg)', opacity: '0' },
          '70%': { transform: 'scale(1.2) rotate(3deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
      },
      animation: {
        marquee: 'marquee 22s linear infinite',
        wiggle: 'wiggle 0.5s ease-in-out infinite',
        floaty: 'floaty 3s ease-in-out infinite',
        'spin-slow': 'spinSlow 12s linear infinite',
        'pop-in': 'popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      },
    },
  },
  plugins: [],
}
