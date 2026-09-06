/**
 * NEER Colours — named palette for JS use
 * (CSS custom properties in tokens.css are the source of truth for styles;
 *  these mirrors are for JS logic: chart fills, legend dots, conditional classes.)
 */

export const palette = {
  navy: {
    50: '#f2f6fb', 100: '#e3ecf5', 200: '#c4d6e9', 300: '#95b3d4',
    400: '#5d89b6', 500: '#2f6294', 600: '#1d4d7e', 700: '#123f6b',
    800: '#0d345a', 900: '#0a2e52', 950: '#061d37',
  },
  ocean: {
    50: '#eef8fb', 100: '#d7eef6', 200: '#afdded', 300: '#79c4dd',
    400: '#41a3c6', 500: '#1f87ab', 600: '#146f92', 700: '#135a77',
    800: '#144a61', 900: '#143e52',
  },
  teal: { 100: '#d5f0e9', 600: '#0f766e', 700: '#115e59' },

  status: {
    favourable: '#1b6e33',
    caution:    '#8a5a00',
    unfavourable: '#b3261e',
    unavailable:  '#5c6a78',
  },

  india: {
    saffron: '#ff9933',
    green:   '#138808',
    white:   '#ffffff',
  },

  chart: {
    land:      '#e9edf1',
    coast:     '#d3e3ee',
    sea:       '#dcecf4',
    seaDeep:   '#c5dce9',
  },
}
