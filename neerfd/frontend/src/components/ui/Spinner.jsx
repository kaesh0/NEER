/**
 * Spinner — accessible inline loading indicator.
 */
export default function Spinner({
  size = 'md',
  label = 'Loading',
  className = '',
  ...rest
}) {
  const sizes = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-[2.5px]',
    lg: 'w-12 h-12 border-3',
  }

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      role="status"
      aria-label={label}
      {...rest}
    >
      <span
        className={`${sizes[size]} rounded-full border-neer-surface-sunken border-t-neer-ocean-600 animate-neer-spin`}
        aria-hidden="true"
      />
    </div>
  )
}
