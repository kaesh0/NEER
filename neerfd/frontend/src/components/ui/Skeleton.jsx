/**
 * Skeleton — shimmer loading placeholder.
 */
export default function Skeleton({
  variant = 'text',
  width,
  height,
  rounded = false,
  className = '',
  ...rest
}) {
  const base = 'bg-gradient-to-r from-neer-surface-sunken via-neer-surface-alt to-neer-surface-sunken bg-[length:200%_100%] animate-neer-shimmer flex-shrink-0'

  const variants = {
    text: 'h-4 w-full',
    circle: 'w-12 h-12 rounded-full',
    rect: 'w-full h-24',
  }

  const classes = [
    base,
    variants[variant],
    rounded && 'rounded-[0.875rem]',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const style = {
    ...(width && { width }),
    ...(height && { height }),
  }

  return (
    <div
      className={classes}
      style={Object.keys(style).length ? style : undefined}
      aria-hidden="true"
      {...rest}
    />
  )
}

/**
 * SkeletonLines — convenience: renders N skeleton text lines.
 */
export function SkeletonLines({ lines = 3, lastWidth = '60%', gap = '0.75rem', className = '' }) {
  return (
    <div className={`flex flex-col ${className}`} style={{ gap }} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? lastWidth : '100%'}
        />
      ))}
    </div>
  )
}
