/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B1120',
        card: '#0F172A',
        cardHover: '#1E293B',
        panel: '#131D33',
        surfaceBorder: '#1E293B',
        surfaceBorderLight: '#334155',
        primary: {
          DEFAULT: '#10E76E',
          hover: '#05D660',
          muted: 'rgba(16, 231, 110, 0.15)',
        },
        cyanAccent: {
          DEFAULT: '#06B6D4',
          hover: '#0891B2',
          muted: 'rgba(6, 182, 212, 0.15)',
        },
        electricYellow: '#FACC15',
        errorRed: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'glow-primary': '0 0 20px -5px rgba(16, 231, 110, 0.3)',
        'glow-cyan': '0 0 20px -5px rgba(6, 182, 212, 0.3)',
      }
    },
  },
  plugins: [],
}
