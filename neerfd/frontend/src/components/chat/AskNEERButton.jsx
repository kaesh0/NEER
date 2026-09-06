import { Icon } from '../../icons/index.js'

/**
 * AskNEERButton — persistent floating action button to open the chat assistant.
 */
export default function AskNEERButton({
  onClick,
  label = 'Ask NEER',
  docked = true,
  className = '',
}) {
  return (
    <button
      className={`inline-flex items-center gap-2 px-4 h-12 rounded-full bg-neer-navy-900 text-white text-neer-base font-semibold shadow-neer-md transition-all duration-neer-base ease-neer-out cursor-pointer whitespace-nowrap hover:bg-neer-navy-800 hover:shadow-neer-lg active:scale-[0.97] ${
        docked ? 'fixed bottom-5 right-4 z-[300] md:bottom-6 md:right-6' : ''
      } ${className}`}
      onClick={onClick}
      type="button"
      aria-label={label}
    >
      <Icon name="messageCircle" size={22} className="flex-shrink-0" aria-hidden="true" />
      <span className="leading-none">{label}</span>
      <Icon name="mic" size={14} className="flex-shrink-0 opacity-60" aria-hidden="true" />
    </button>
  )
}
