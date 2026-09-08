import AppHeader from './AppHeader.jsx'

/**
 * AppShell — top-level page wrapper.
 * Bottom nav is rendered separately (floating pill) so it doesn't take padding.
 */
export default function AppShell({
  header = {},
  children,
  bottomNav,
  banner = null,
  className = '',
}) {
  return (
    <div className={`flex flex-col min-h-dvh ${className}`}>
      {header !== false && <AppHeader {...(typeof header === 'object' ? header : {})} />}
      {banner}
      <main className="flex-1 w-full">
        {children}
      </main>
      {bottomNav && (
        <div className="fixed inset-x-0 bottom-3 z-0 pointer-events-none md:hidden">
          {bottomNav}
        </div>
      )}
    </div>
  )
}
