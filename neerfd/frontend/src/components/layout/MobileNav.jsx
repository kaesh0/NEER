import { Icon } from '../../icons/index.js'

/**
 * MobileNav — floating pill-style bottom navigation matching the visual reference.
 * Dark navy pill floating above the bottom edge.
 */
export default function MobileNav({ items = [], className = '' }) {
  const fabItem = items.find(i => i.id === 'afab')
  const tabItems = items.filter(i => i.id !== 'afab')

  return (
    <div className={`relative md:hidden ${className}`}>
      {/* Floating pill bar — dark navy, rounded-full, centered */}
      <nav
        className="fixed bottom-3 left-4 right-4 z-[100] mx-auto"
        style={{ maxWidth: 'calc(100% - 2rem)', borderRadius: '9999px', padding: '0.375rem' }}
        role="tablist"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-center gap-0 bg-neer-navy-900 shadow-neer-lg rounded-full overflow-hidden pb-[max(env(safe-area-inset-bottom, 0px), 0.75rem)]">
          {tabItems.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={item.active}
              className={`flex flex-col items-center justify-center gap-px py-1.5 px-3 min-w-[4.5rem] relative transition-colors duration-neer-base ease-neer-out ${
                item.active ? 'text-white' : 'text-neer-ink-inverse-muted'
              }`}
              onClick={item.onClick}
              type="button"
            >
              <Icon name={item.icon} size={16} aria-hidden="true" />
              <span className="text-[0.55rem] leading-none font-semibold tracking-wider">{item.label.toUpperCase()}</span>
              {item.badge != null && (
                <span className="absolute -top-0.5 right-1 min-w-[1rem] h-2 px-0.5 text-[0.45rem] font-bold leading-2 text-center text-white bg-neer-unfavourable rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          {/* Ask NEER button inside the pill */}
          {fabItem && (
            <button
              key="afab"
              role="button"
              aria-label={fabItem.label}
              className="flex items-center justify-center gap-1 px-2.5 py-1.5 ml-1 bg-neer-ocean-600 hover:bg-neer-ocean-500 transition-colors"
              onClick={fabItem.onClick}
              type="button"
            >
              <Icon name="messageCircle" size={14} aria-hidden="true" />
              <span className="text-[0.55rem] font-bold leading-none tracking-wider text-white">ASK</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  )
}
