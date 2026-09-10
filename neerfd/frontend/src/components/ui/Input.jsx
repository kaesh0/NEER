import { Icon } from '../../icons/index.js'
import { useTranslation } from '../../i18n/translations.js'

/**
 * Input — labelled text field with hint, error, and icon support.
 */
export default function Input({
  id,
  label,
  hint,
  error,
  icon,
  disabled = false,
  type = 'text',
  placeholder,
  multiline = false,
  rows = 3,
  className = '',
  ...rest
}) {
  const { t } = useTranslation()
  const errorId = error ? `${id}-error` : undefined
  const hintId = hint && !error ? `${id}-hint` : undefined

  const { className: restClassName, ...restProps } = rest

  const inputClasses = [
    'w-full h-11 px-3.5 text-neer-base text-neer-ink bg-white border border-neer-border-strong rounded-[0.625rem] outline-none transition-all duration-neer-base ease-neer-out placeholder:text-neer-ink-muted',
    icon && 'pl-11',
    error && 'border-neer-unfavourable focus:shadow-[0_0_0_3px_rgba(179,38,30,0.18)]',
    !error && 'focus:border-neer-ocean-500 focus:shadow-neer-focus',
    disabled && 'bg-neer-surface-sunken text-neer-ink-disabled cursor-not-allowed',
    multiline && 'h-auto min-h-20 p-3 resize-y',
    restClassName,
  ]
    .filter(Boolean)
    .join(' ')

  const FieldTag = multiline ? 'textarea' : 'input'

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={id} className="text-neer-sm font-medium text-neer-ink">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <Icon name={icon} size={18} className="absolute left-3 text-neer-ink-muted pointer-events-none" aria-hidden="true" />
        )}
        <FieldTag
          id={id}
          className={inputClasses}
          type={multiline ? undefined : type}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId || hintId || undefined}
          {...(multiline ? { rows } : {})}
          {...restProps}
        />
      </div>
      {error && (
        <div id={errorId} className="text-neer-xs text-neer-unfavourable" role="alert">
          {error}
        </div>
      )}
      {hint && !error && (
        <div id={hintId} className="text-neer-xs text-neer-ink-muted">
          {hint}
        </div>
      )}
    </div>
  )
}
