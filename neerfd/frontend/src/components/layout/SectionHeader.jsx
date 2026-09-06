/**
 * SectionHeader — consistent section heading.
 */
export default function SectionHeader({
  title,
  subtitle,
  badge,
  actions,
  as: Tag = 'h2',
  className = '',
}) {
  return (
    <div className={`flex items-start justify-between gap-3 mb-4 ${className}`}>
      <div className="min-w-0">
        <Tag className="text-neer-lg font-bold text-neer-ink m-0">{title}</Tag>
        {subtitle && <p className="text-neer-sm text-neer-ink-secondary mt-1">{subtitle}</p>}
      </div>
      {(badge || actions) && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {badge}
          {actions}
        </div>
      )}
    </div>
  )
}
