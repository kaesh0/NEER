/**
 * Card — reusable card with variant, padding, interactive hover and accent.
 */
export default function Card({
  variant = 'bordered',
  pad = 'md',
  interactive = false,
  accent,
  title,
  subtitle,
  actions,
  as: Tag = 'div',
  className = '',
  children,
  ...rest
}) {
  const base = 'bg-white rounded-[0.875rem] overflow-hidden transition-all duration-neer-base ease-neer-out'

  const variants = {
    bordered: 'border border-neer-border',
    elevated: 'shadow-neer-sm',
    flat: 'border-none',
  }

  const pads = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
  }

  const accents = {
    favourable: 'border-l-4 border-l-neer-favourable-strong',
    caution: 'border-l-4 border-l-neer-caution-strong',
    unfavourable: 'border-l-4 border-l-neer-unfavourable-strong',
    unavailable: 'border-l-4 border-l-neer-unavailable-strong',
  }

  const interactiveClass = interactive
    ? 'cursor-pointer hover:shadow-neer-md hover:-translate-y-0.5 active:translate-y-0'
    : ''

  const classes = [
    base,
    variants[variant],
    interactiveClass,
    accent && accents[accent],
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const hasHeader = title || subtitle || actions

  return (
    <Tag className={classes} {...rest}>
      {hasHeader && (
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div>
            {title && <div className="text-neer-md font-semibold text-neer-ink">{title}</div>}
            {subtitle && <div className="text-neer-sm text-neer-ink-secondary mt-1">{subtitle}</div>}
          </div>
          {actions && <div className="flex gap-2 flex-shrink-0">{actions}</div>}
        </div>
      )}
      <div className={pads[pad]}>{children}</div>
    </Tag>
  )
}
