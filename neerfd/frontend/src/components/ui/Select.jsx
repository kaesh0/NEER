import { useTranslation } from '../../i18n/translations.js'

/**
 * Select — labelled dropdown with Tailwind styling.
 */
export default function Select({
  id,
  label,
  hint,
  options = [],
  placeholder = 'Select…',
  disabled = false,
  value,
  onChange,
  className = '',
  ...rest
}) {
  const { t } = useTranslation()

  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value, e)
    }
  }

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="text-neer-sm font-medium text-neer-ink">
          {label}
        </label>
      )}
      <select
        id={id}
        className="w-full h-11 px-3 text-neer-base text-neer-ink bg-white border border-neer-border-strong rounded-[0.625rem] outline-none transition-all duration-neer-base ease-neer-out focus:border-neer-ocean-500 focus:shadow-neer-focus disabled:bg-neer-surface-sunken disabled:text-neer-ink-disabled disabled:cursor-not-allowed"
        disabled={disabled}
        value={value}
        onChange={handleChange}
        {...rest}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && <div className="text-neer-xs text-neer-ink-muted">{hint}</div>}
    </div>
  )
}
