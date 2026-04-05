import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Kinetic Ledger Surface System ──────────────────────────────
        surface:    '#131313',          // global background
        'cl':       '#1b1b1b',          // container-low
        'cll':      '#0e0e0e',          // container-lowest
        'ch':       '#2a2a2a',          // container-high
        'chh':      '#353535',          // container-highest (interactive)

        // ── Content ────────────────────────────────────────────────────
        primary:    '#FFFFFF',          // main text + data
        'on-s':     '#e2e2e2',          // secondary text (on_surface)
        muted:      '#919191',          // outline_variant / blade color
        blade:      '#919191',

        // ── Semantic ───────────────────────────────────────────────────
        gain:  '#4bdfa4',               // secondary: positive PnL
        loss:  '#ea6767',               // tertiary_container: negative PnL
      },
      fontFamily: {
        display: ['Manrope', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['3.5rem',   { lineHeight: '1.0', letterSpacing: '-0.04em', fontWeight: '800' }],
        'display-md': ['2.5rem',   { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '700' }],
        'display-sm': ['1.75rem',  { lineHeight: '1.1',  letterSpacing: '-0.02em', fontWeight: '700' }],
        'label-lg':   ['0.875rem', { lineHeight: '1.4',  letterSpacing: '0.01em' }],
        'label-md':   ['0.75rem',  { lineHeight: '1.4',  letterSpacing: '0.02em' }],
        'label-sm':   ['0.6875rem',{ lineHeight: '1.4',  letterSpacing: '0.03em' }],
      },
      borderRadius: {
        DEFAULT: '0px',
        none: '0px',
      },
      spacing: {
        '18': '4.5rem',
      },
      keyframes: {
        'blade-in': {
          '0%':   { opacity: '0', transform: 'scaleX(0)' },
          '100%': { opacity: '1', transform: 'scaleX(1)' },
        },
        'data-up': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'blade-in': 'blade-in 0.2s ease-out',
        'data-up':  'data-up 0.3s ease-out',
        'shimmer':  'shimmer 1.5s infinite linear',
      },
    },
  },
  plugins: [],
} satisfies Config
