import { useState, useRef, useEffect } from 'react'
import { Icon } from '../../icons/index.js'
import { useLanguage } from '../../context/LanguageContext.jsx'
import { useTranslation } from '../../i18n/translations.js'
import { useAuth } from '../../context/AuthContext.jsx'
import LocationSelector from '../ui/LocationSelector.jsx'
import { LogoIcon } from '../ui/Logo.jsx'

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
        className="flex items-center gap-3 p-1.5 -ml-1.5 rounded-xl hover:bg-slate-100/70 transition group text-left"
        type="button"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 shadow-sm group-hover:border-sky-300 transition flex-shrink-0">
          <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path d="M2 12q2.5 2 5 0t5 0 5 0 5 0" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 19q2.5 2 5 0t5 0 5 0 5 0" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 5q2.5 2 5 0t5 0 5 0 5 0" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-bold tracking-wider uppercase text-sky-600 leading-none mb-1">
            MARINE INTELLIGENCE PLATFORM
          </span>
          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-base leading-tight group-hover:text-sky-600 transition">
            <span>{activeLabel}</span>
            <Icon name="chevronDown" size={14} className={`text-slate-400 group-hover:text-sky-600 group-hover:translate-y-0.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
  currentLocation,
  onLocationChange,
  className = '',
}) {
  const { t } = useTranslation()

  return (
    <header className={`sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all duration-200 shadow-sm ${className}`} role="banner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3">
            {onMenu && (
              <button
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-[0.625rem] text-slate-800 transition-colors hover:bg-slate-100"
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
              <div className="flex items-center gap-3 p-1.5 -ml-1.5 text-left">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 shadow-sm">
                  <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path d="M2 12q2.5 2 5 0t5 0 5 0 5 0" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 19q2.5 2 5 0t5 0 5 0 5 0" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 5q2.5 2 5 0t5 0 5 0 5 0" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-sky-600 leading-none mb-1">
                    MARINE INTELLIGENCE PLATFORM
                  </span>
                  <span className="text-base font-bold text-slate-900 tracking-tight">{title}</span>
                </div>
              </div>
            )}
          </div>

          {/* Central Navigation Tabs (Clickable, Reactive) */}
          {onTabChange && (
            <nav aria-label="Main Navigation" className="relative hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={(e) => {
                      if (item.onClick) {
                        item.onClick(e)
                      } else if (onTabChange) {
                        onTabChange(item.id)
                      }
                    }}
                    className={`nav-tab-btn px-4 py-2 rounded-xl text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-sky-50 text-sky-600 font-semibold border-b-2 border-sky-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 bg-transparent border-b-2 border-transparent font-medium'
                    } flex items-center gap-1.5`}
                    type="button"
                  >
                    <span>{t(item.label)}</span>
                    {item.badge != null && item.badge > 0 && (
                      <span className="w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-sm">
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          )}

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelector />
            
            {/* Interactive Location Selector Pill matching code.html */}
            <LocationSelector
              currentLocation={currentLocation}
              onLocationChange={onLocationChange}
              persona={persona}
              locationName={locationName}
            />

            {/* User profile avatar dropdown */}
            <ProfileMenu onNavigate={onNavigate} />
          </div>
        </div>
      </div>
      {/* Oceanic Progress / Status Line Indicator */}
      <div className="h-0.5 w-full bg-gradient-to-r from-teal-400 via-sky-500 to-blue-600 opacity-80" />
    </header>
  )
}
