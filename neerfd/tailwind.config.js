/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        neer: {
          // Navy palette (primary)
          navy: {
            50: '#f2f6fb',
            100: '#e3ecf5',
            200: '#c4d6e9',
            300: '#95b3d4',
            400: '#5d89b6',
            500: '#2f6294',
            600: '#1d4d7e',
            700: '#123f6b',
            800: '#0d345a',
            900: '#0a2e52',
            950: '#061d37',
          },
          // Ocean palette (supporting)
          ocean: {
            50: '#eef8fb',
            100: '#d7eef6',
            200: '#afdded',
            300: '#79c4dd',
            400: '#41a3c6',
            500: '#1f87ab',
            600: '#146f92',
            700: '#135a77',
            800: '#144a61',
            900: '#143e52',
          },
          // Teal accent
          teal: {
            100: '#d5f0e9',
            600: '#0f766e',
            700: '#115e59',
          },
          // Status colors
          favourable: {
            DEFAULT: '#1b6e33',
            light: '#e4f3e8',
            border: '#b7dcc2',
            strong: '#155a29',
          },
          caution: {
            DEFAULT: '#8a5a00',
            light: '#fcf1d9',
            border: '#eed9a6',
            strong: '#6d4700',
          },
          unfavourable: {
            DEFAULT: '#b3261e',
            light: '#fdeae8',
            border: '#f3c4bf',
            strong: '#8f1d17',
          },
          unavailable: {
            DEFAULT: '#5c6a78',
            light: '#edf0f4',
            border: '#d4dbe3',
            strong: '#46535f',
          },
          info: {
            DEFAULT: '#135c77',
            light: '#e8f4f9',
            border: '#bcdceb',
          },
          // Surfaces
          bg: '#f4f7fa',
          surface: '#ffffff',
          'surface-alt': '#eef3f7',
          'surface-sunken': '#e6edf3',
          border: '#d9e2ec',
          'border-strong': '#b8c9d9',
          // Text/ink
          ink: {
            DEFAULT: '#0f2540',
            secondary: '#41586e',
            muted: '#66798c',
            disabled: '#98a8b8',
            inverse: '#ffffff',
            'inverse-muted': '#c3d2e2',
          },
        },
        // Indian identity accents
        india: {
          saffron: '#ff9933',
          green: '#138808',
          white: '#ffffff',
        },
        // Map placeholder palette
        chart: {
          land: '#e9edf1',
          coast: '#d3e3ee',
          sea: '#dcecf4',
          'sea-deep': '#c5dce9',
        },
      },
      fontFamily: {
        sans: [
          '"Segoe UI"',
          'system-ui',
          '-apple-system',
          '"Noto Sans"',
          '"Noto Sans Devanagari"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        'neer-xs': ['0.75rem', { lineHeight: '1.5' }],
        'neer-sm': ['0.8125rem', { lineHeight: '1.65' }],
        'neer-base': ['0.9375rem', { lineHeight: '1.5' }],
        'neer-md': ['1rem', { lineHeight: '1.5' }],
        'neer-lg': ['1.125rem', { lineHeight: '1.5' }],
        'neer-xl': ['1.375rem', { lineHeight: '1.3' }],
        'neer-2xl': ['1.625rem', { lineHeight: '1.3' }],
        'neer-3xl': ['2rem', { lineHeight: '1.15' }],
        'neer-display': ['2.5rem', { lineHeight: '1.15' }],
      },
      spacing: {
        'neer-1': '0.25rem',
        'neer-2': '0.5rem',
        'neer-3': '0.75rem',
        'neer-4': '1rem',
        'neer-5': '1.25rem',
        'neer-6': '1.5rem',
        'neer-7': '1.75rem',
        'neer-8': '2rem',
        'neer-9': '2.5rem',
        'neer-10': '3rem',
        'neer-11': '3.5rem',
        'neer-12': '4rem',
        'neer-13': '6rem',
      },
      borderRadius: {
        'neer-xs': '0.375rem',
        'neer-sm': '0.5rem',
        'neer-md': '0.625rem',
        'neer-lg': '0.875rem',
        'neer-xl': '1.125rem',
      },
      boxShadow: {
        'neer-xs': '0 1px 2px rgba(10, 46, 82, 0.06)',
        'neer-sm': '0 1px 2px rgba(10, 46, 82, 0.04), 0 3px 10px rgba(10, 46, 82, 0.06)',
        'neer-md': '0 2px 6px rgba(10, 46, 82, 0.05), 0 12px 28px rgba(10, 46, 82, 0.1)',
        'neer-lg': '0 8px 18px rgba(6, 29, 55, 0.16), 0 4px 10px rgba(6, 29, 55, 0.1)',
        'neer-focus': '0 0 0 3px rgba(31, 135, 171, 0.28)',
      },
      transitionDuration: {
        'neer-fast': '120ms',
        'neer-base': '200ms',
        'neer-slow': '320ms',
        'neer-slower': '520ms',
        'neer-wave': '9000ms',
      },
      transitionTimingFunction: {
        'neer-out': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'neer-in-out': 'cubic-bezier(0.45, 0, 0.2, 1)',
        'neer-pop': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        'neer-fade-in-up': {
          from: { opacity: '0', transform: 'translateY(0.5rem)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'neer-fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'neer-drift-x': {
          from: { transform: 'translateX(-3%)' },
          to: { transform: 'translateX(3%)' },
        },
        'neer-sway-y': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-0.35rem)' },
        },
        'neer-breathe': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
        'neer-shimmer': {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
        'neer-spin': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'neer-fade-in-up': 'neer-fade-in-up 520ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'neer-fade-in': 'neer-fade-in 200ms cubic-bezier(0.45, 0, 0.2, 1) both',
        'neer-drift': 'neer-drift-x 9000ms ease-in-out infinite alternate',
        'neer-sway': 'neer-sway-y 4s ease-in-out infinite',
        'neer-breathe': 'neer-breathe 2.4s cubic-bezier(0.45, 0, 0.2, 1) infinite',
        'neer-shimmer': 'neer-shimmer 1.6s cubic-bezier(0.45, 0, 0.2, 1) infinite',
        'neer-spin': 'neer-spin 0.7s linear infinite',
      },
    },
  },
  plugins: [],
}
