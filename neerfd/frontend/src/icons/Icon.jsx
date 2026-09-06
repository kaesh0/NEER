import icons from './paths.js'

/**
 * Icon — renders a 24x24 inline SVG from the name map.
 *
 * Props:
 *   name      — key from the icons map (e.g. "wave", "fish")
 *   size      — px (default 24)
 *   className — optional extra class
 *   ariaLabel — if the icon is purely decorative, omit; otherwise provide
 *   ...rest   — forwarded to <svg>
 */
export default function Icon({
  name,
  size = 24,
  className = '',
  ariaLabel,
  ...rest
}) {
  const paths = icons[name]
  if (!paths) return null

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`neer-icon ${className}`.trim()}
      aria-hidden={ariaLabel ? undefined : 'true'}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      {...rest}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}
