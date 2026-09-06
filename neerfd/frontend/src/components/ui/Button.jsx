import { Icon } from '../../icons/index.js'

/**
 * Button — reusable button with variant, size, loading and icon support.
 * All styles are Tailwind utility classes.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  iconOnly = false,
  disabled = false,
  children,
  className = '',
  ...rest
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold border border-transparent rounded-[0.625rem] cursor-pointer select-none whitespace-nowrap transition-all duration-neer-base ease-neer-out will-change-transform focus-visible:shadow-neer-focus focus-visible:outline-none active:scale-[0.985] disabled:opacity-55 disabled:cursor-not-allowed'

  const sizes = {
    sm: 'h-9 px-3 text-neer-sm',
    md: 'h-11 px-4 text-neer-base',
    lg: 'h-14 px-6 text-neer-lg',
  }

  const iconSizes = {
    sm: 'w-9 h-9 px-0',
    md: 'w-11 h-11 px-0',
    lg: 'w-14 h-14 px-0',
  }

  const variants = {
    primary: 'bg-neer-navy-900 text-neer-ink-inverse hover:bg-neer-navy-800',
    secondary: 'bg-transparent border-neer-border-strong text-neer-navy-800 hover:bg-neer-navy-50',
    ghost: 'bg-transparent text-neer-navy-700 hover:bg-neer-navy-50',
    danger: 'bg-neer-unfavourable text-neer-ink-inverse hover:bg-neer-unfavourable-strong',
    accent: 'bg-neer-ocean-600 text-neer-ink-inverse hover:bg-neer-ocean-700',
  }

  const classes = [
    base,
    sizes[size],
    variants[variant],
    fullWidth && 'w-full',
    iconOnly && iconSizes[size],
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-neer-spin flex-shrink-0" aria-hidden="true" />
      ) : icon ? (
        <Icon name={icon} size={size === 'sm' ? 16 : size === 'lg' ? 20 : 18} aria-hidden="true" />
      ) : null}
      {iconOnly ? (
        <span className="sr-only">{children}</span>
      ) : (
        <span className="leading-none">{children}</span>
      )}
    </button>
  )
}
