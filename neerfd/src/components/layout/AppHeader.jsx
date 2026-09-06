import { useState, useRef, useEffect } from 'react'
import { Icon } from '../../icons/index.js'
import { useLanguage } from '../../context/LanguageContext.jsx'
import { useTranslation } from '../../i18n/translations.js'
import { useAuth } from '../../context/AuthContext.jsx'

function LanguageSelector() {
  const { t } = useTranslation()

  const { language, setLanguage } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {


      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-neer-xs font-medium text-neer-ink-secondary bg-white rounded-lg border border-neer-border hover:bg-neer-navy-50 transition-colors"
        aria-label="Select language"
      >
        <span className="text-base leading-none">{language === 'hi' ? '🇮🇳' : '🇬🇧'}</span>
        <span className="hidden sm:inline">{language === 'hi' ? 'हिंदी' : 'English'}</span>
        <Icon name="chevronDown" size={14} className={`text-neer-ink-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-40 bg-white border border-neer-border rounded-xl shadow-neer-lg z-[200] overflow-hidden py-1">
          <button
            onClick={() => { setLanguage('en'); setIsOpen(false) }}
            className={`w-full flex items-center justify-between px-4 py-2 text-left hover:bg-neer-surface-alt transition-colors group ${language === 'en' ? 'bg-neer-ocean-50' : ''}`}
          >
            <div className="flex items-center gap-2 text-sm font-medium text-neer-ink">
              <span>🇬🇧</span> {t('English')}
            </div>
            {language === 'en' && <Icon name="check" size={16} className="text-neer-ocean-600" />}
          </button>
          <button
            onClick={() => { setLanguage('hi'); setIsOpen(false) }}
            className={`w-full flex items-center justify-between px-4 py-2 text-left hover:bg-neer-surface-alt transition-colors group ${language === 'hi' ? 'bg-neer-ocean-50' : ''}`}
          >
            <div className="flex items-center gap-2 text-sm font-medium text-neer-ink">
              <span>🇮🇳</span> हिंदी
            </div>
            {language === 'hi' && <Icon name="check" size={16} className="text-neer-ocean-600" />}
          </button>
        </div>
      )}
    </div>
  )
}

function WorkspaceSwitcher({ persona, onPersonaChange, title, kicker }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const { t } = useTranslation()

  const workspaces = [
    { id: 'fisherman', label: t('Fisherman') },
    { id: 'marine', label: t('Marine / Maritime Operator') },
    { id: 'authority', label: t('Authority') },
  ]

  const activeLabel = workspaces.find((w) => w.id === persona)?.label || title

  useEffect(() => {
    function handleClickOutside(event) {


      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 group hover:bg-neer-navy-50 rounded-lg p-1.5 -ml-1.5 transition-colors text-left"
      >
        <Icon name="wave" size={24} className="text-neer-ocean-600 flex-shrink-0" aria-hidden="true" />
        <div className="flex flex-col justify-center">
          <div className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-neer-ocean-600">{kicker}</div>
          <div className="flex items-center gap-1.5 mt-[-2px]">
            <span className="text-lg md:text-xl font-bold text-neer-navy-900 tracking-tight">{activeLabel}</span>
            <Icon name="chevronDown" size={16} className={`text-neer-ink-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-neer-border rounded-xl shadow-neer-lg z-[200] overflow-hidden py-2">
          <div className="px-4 py-2 border-b border-neer-border mb-2">
            <div className="text-neer-xs font-semibold text-neer-ink-secondary uppercase tracking-wider">{t('Switch Workspace')}</div>
          </div>
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => {
                onPersonaChange(ws.id)
                setIsOpen(false)
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-neer-surface-alt transition-colors group"
            >
              <span className={`text-sm ${persona === ws.id ? 'font-bold text-neer-ocean-600' : 'font-medium text-neer-ink group-hover:text-neer-navy-900'}`}>
                {ws.label}
              </span>
              {persona === ws.id && <Icon name="check" size={16} className="text-neer-ocean-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ProfileMenu({ onNavigate }) {
  const { user, isGuest, logout } = useAuth()
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    // It will automatically navigate to landing due to App.jsx effect
  }

  const handleAuthAction = (path) => {
    logout()
    if (onNavigate) {
      onNavigate(path)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-neer-ocean-50 border border-neer-border hover:bg-neer-ocean-100 transition-colors"
        aria-label="User profile"
      >
        <Icon name="user" size={16} className="text-neer-ink-secondary" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-neer-border rounded-xl shadow-neer-lg z-[200] overflow-hidden py-2">
          {user ? (
            <>
              <div className="px-4 py-3 border-b border-neer-border mb-2 bg-slate-50">
                <div className="text-sm font-bold text-neer-ink truncate">{user.name}</div>
                <div className="text-xs text-neer-ink-muted capitalize truncate">{t(typeof user.role === 'string' ? user.role : 'User')} {t('Workspace')}</div>
                {user.email && <div className="text-[0.7rem] text-neer-ink-muted truncate">{user.email}</div>}
              </div>
              <button
                onClick={() => {
                  setIsOpen(false)
                  if (onNavigate) onNavigate('landing')
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm font-medium text-neer-ink hover:bg-neer-surface-alt transition-colors"
              >
                <Icon name="target" size={16} className="text-neer-ocean-600" />
                {t('Switch Workspace')}
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm font-medium text-neer-unfavourable hover:bg-neer-surface-alt transition-colors"
              >
                <Icon name="logOut" size={16} />
                {t('Logout')}
              </button>
            </>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-neer-border mb-2 bg-slate-50">
                <div className="text-sm font-bold text-neer-ink">{t('Guest User')}</div>
                <div className="text-xs text-neer-ink-muted">{t('Not signed in')}</div>
              </div>
              <button
                onClick={() => handleAuthAction('login')}
                className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm font-medium text-neer-ink hover:bg-neer-surface-alt transition-colors"
              >
                <Icon name="user" size={16} className="text-neer-ocean-600" />
                {t('Login')}
              </button>
              <button
                onClick={() => handleAuthAction('register')}
                className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm font-medium text-neer-ink hover:bg-neer-surface-alt transition-colors"
              >
                <Icon name="userPlus" size={16} className="text-neer-ocean-600" />
                {t('Register / Sign Up')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * AppHeader — refined header matching the visual reference.
 * Features: menu, workspace switcher, desktop nav, location indicator, user profile.
 */
export default function AppHeader({
  kicker = 'Marine Intelligence Platform',
  title = 'NEER',
  onMenu,
  activeTab,
  onTabChange,
  persona,
  onPersonaChange,
  navItems = [],
  onNavigate,
  locationName = '',
  onChangeLocation,
  className = '',
}) {
  const { t } = useTranslation()

  return (
    <header className={`sticky top-0 z-[100] bg-white border-b border-neer-border ${className}`} role="banner">
      <div className="neer-gov-strip" aria-hidden="true" />
      <div className="flex items-center justify-between h-[4.5rem] px-[clamp(0.75rem, 2.5vw, 1.75rem)] md:px-8 lg:px-12 w-full mx-auto">
        <div className="flex items-center gap-3">
          {onMenu && (
            <button
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-[0.625rem] text-neer-navy-800 transition-colors duration-neer-fast hover:bg-neer-navy-50"
              onClick={onMenu}
              aria-label="Open menu"
              type="button"
            >
              <Icon name="menu" size={18} />
            </button>
          )}
          
          {persona ? (
            <WorkspaceSwitcher persona={persona} onPersonaChange={onPersonaChange} title={title} kicker={t(kicker)} />
          ) : (
            <div className="flex flex-col justify-center">
              <div className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-neer-ocean-600">{t(kicker)}</div>
              <div className="flex items-center gap-1.5 mt-[-2px]">
                <Icon name="wave" size={22} className="text-neer-ocean-600 flex-shrink-0" aria-hidden="true" />
                <span className="text-xl font-bold text-neer-navy-900 tracking-tight">{title}</span>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Navigation */}
        {onTabChange && (
          <nav className="hidden md:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={(e) => {
                  if (item.onClick) {
                    item.onClick(e)
                  } else if (onTabChange) {
                    onTabChange(item.id)
                  }
                }}
                className={`relative py-2 text-sm font-semibold transition-colors ${
                  activeTab === item.id ? 'text-neer-ocean-600' : 'text-neer-ink-secondary hover:text-neer-ink'
                }`}
              >
                {t(item.label)}
                {item.badge != null && (
                  <span className="absolute -top-1 -right-3 min-w-[1.125rem] h-4 px-1 text-[0.6rem] font-bold flex items-center justify-center text-white bg-neer-unfavourable rounded-full">
                    {item.badge}
                  </span>
                )}
                {activeTab === item.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-neer-ocean-600 rounded-t-full" />
                )}
              </button>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          <LanguageSelector />
          {/* Location indicator — click to change your home waters */}
          <button
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-neer-xs font-medium text-neer-ink-secondary bg-neer-surface-alt rounded-lg border border-neer-border hover:bg-neer-navy-50 transition-colors"
            onClick={onChangeLocation}
            aria-label="Not your location? Update location"
            title={t('Not your location? Click to update')}
          >
            <Icon name="location" size={14} className="text-neer-ocean-600" />
            <span className={`max-w-[9rem] truncate ${locationName ? '' : 'text-neer-ocean-600 font-semibold'}`}>
              {locationName || t('Set location')}
            </span>
            <Icon name="chevronDown" size={12} className="text-neer-ink-muted" />
          </button>

          {/* User profile avatar dropdown */}
          <ProfileMenu onNavigate={onNavigate} />
        </div>
      </div>
    </header>
  )
}
