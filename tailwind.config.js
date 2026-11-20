/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Nordic Daylight palette
        paper: '#F8FAFC',
        ink: '#0F172A',
        pulse: '#0D9488',
        live: '#E11D48',
        'brand-strong': '#0F766E',
        sage: '#F1F5F9',
        'sage-card': '#FFFFFF',
        'sage-tint': '#F0FDFA',
        'sage-leader': '#CCFBF1',
        muted: '#64748B',
        hairline: '#E2E8F0',
        'hairline-soft': '#CBD5E1',
        'ink-muted': '#CBD5E1',
        'ink-subtle': '#CBD5E1',
        'ink-track': '#334155',
        'ink-divider': '#475569',
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Space Grotesk"', 'Manrope', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        hero: '20px',
        'hero-lg': '22px',
      },
    },
  },
  plugins: [],
}
