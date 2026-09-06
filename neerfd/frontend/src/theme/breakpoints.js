/**
 * NEER Breakpoints
 *
 * Mobile-first. Always write min-width media queries.
 * xs = default (small phones)
 * sm = 480px  (large phones)
 * md = 768px  (tablets)
 * lg = 1024px (small desktops)
 * xl = 1280px (wide desktops)
 */

export const BREAKPOINTS = {
  xs: 0,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
}

export const MEDIA = {
  up: (bp) => `(min-width: ${BREAKPOINTS[bp]}px)`,
  down: (bp) => `(max-width: ${BREAKPOINTS[bp] - 1}px)`,
}
