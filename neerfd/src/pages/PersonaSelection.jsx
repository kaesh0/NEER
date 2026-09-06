import { Icon } from '../icons/index.js'
import Button from '../components/ui/Button.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useTranslation } from '../i18n/translations.js'
import { useState, useRef, useEffect } from 'react'

function LandingLanguageSelector() {
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
    <div className="absolute top-4 right-4 md:top-8 md:right-8 z-50" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-neer-ink-secondary bg-white/80 backdrop-blur-md rounded-lg border border-neer-border hover:bg-white shadow-sm transition-all"
        aria-label="Select language"
      >
        <span className="text-base leading-none">{language === 'hi' ? '🇮🇳' : '🇬🇧'}</span>
        <span>{language === 'hi' ? 'हिंदी' : 'English'}</span>
        <Icon name="chevronDown" size={14} className={`text-neer-ink-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-40 bg-white border border-neer-border rounded-xl shadow-neer-lg z-[200] overflow-hidden py-1">
          <button
            onClick={() => { setLanguage('en'); setIsOpen(false) }}
            className={`w-full flex items-center justify-between px-4 py-2 text-left hover:bg-neer-surface-alt transition-colors group ${language === 'en' ? 'bg-neer-ocean-50' : ''}`}
          >
            <div className="flex items-center gap-2 text-sm font-medium text-neer-ink">
              <span>🇬🇧</span> English
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

export default function PersonaSelection({ onSelectPersona, onNavigate, hideLanguage = false }) {
  const { t } = useTranslation()

  const personas = [
    {
      id: 'fisherman',
      title: 'Fisherman',
      titleHi: 'मछुआरा',
      description: 'Marine conditions, fishing zones & alerts',
      icon: 'fish',
    },
    {
      id: 'marine',
      title: 'Marine',
      titleHi: 'मरीन / समुद्री संचालन',
      description: 'Route and voyage condition assessment',
      icon: 'map',
    },
    {
      id: 'authority',
      title: 'Authority',
      titleHi: 'प्राधिकरण',
      description: 'Regional risk and coastal monitoring',
      icon: 'globe',
    },
  ]

  return (
    <div className="relative min-h-screen bg-slate-50 overflow-hidden flex flex-col items-center justify-center">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none">
        <div className="absolute inset-0 opacity-[0.4]" style={{ background: 'linear-gradient(to bottom right, #f8fafc, #e0f2fe, #f1f5f9)' }} />
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <path d="M 0 300 Q 400 400 800 200 T 1600 300" fill="none" stroke="#0284c7" strokeWidth="2" />
          <path d="M 0 500 Q 300 600 700 400 T 1500 500" fill="none" stroke="#0284c7" strokeWidth="1" />
          <path d="M 0 700 Q 500 800 900 600 T 1700 700" fill="none" stroke="#0284c7" strokeWidth="1" />
        </svg>
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-neer-ocean-100 rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-100 rounded-full blur-3xl opacity-30 translate-y-1/3 -translate-x-1/4" />
      </div>

      {!hideLanguage && <LandingLanguageSelector />}

      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-5xl mx-auto py-12 px-4 md:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm border border-neer-border mb-6">
            <Icon name="wave" size={32} className="text-neer-ocean-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-neer-navy-900 mb-4 tracking-tight">NEER</h1>
          <p className="text-lg md:text-xl font-medium text-neer-ocean-700 tracking-wide uppercase mb-8">{t('Marine Intelligence for India')}</p>
          <p className="text-neer-ink-secondary text-lg">{t('Choose how you want to use NEER')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-16">
          {personas.map((persona) => (
            <button
              key={persona.id}
              onClick={() => onSelectPersona(persona.id)}
              className="flex flex-col items-start p-6 bg-white/80 backdrop-blur-sm border border-neer-border/80 rounded-2xl hover:border-neer-ocean-400 hover:shadow-neer-lg hover:bg-white hover:-translate-y-1 transition-all duration-300 group text-left"
            >
              <div className="w-14 h-14 rounded-xl bg-neer-ocean-50 text-neer-ocean-600 flex items-center justify-center mb-5 group-hover:bg-neer-ocean-600 group-hover:text-white transition-colors shadow-sm">
                <Icon name={persona.icon} size={28} />
              </div>
              <div className="mb-4">
                <h2 className="text-xl font-bold text-neer-navy-900 leading-tight">{t(persona.title)}</h2>
                <h3 className="text-md font-medium text-neer-ocean-600 mt-1">{persona.titleHi}</h3>
              </div>
              <p className="text-sm text-neer-ink-secondary leading-relaxed border-t border-neer-border/50 pt-4 w-full">
                {t(persona.description)}
              </p>
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center gap-5 w-full max-w-md text-center bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-neer-border/50">
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-12 w-full justify-center">
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-medium text-neer-ink-muted">{t('Already have an account?')}</span>
              <Button variant="secondary" icon="user" className="w-full sm:w-auto" onClick={() => onNavigate && onNavigate('login')}>{t('Login')}</Button>
            </div>
            <div className="hidden sm:block w-px bg-neer-border/80 h-full" />
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-medium text-neer-ink-muted">{t('New to NEER?')}</span>
              <Button variant="primary" className="w-full sm:w-auto" onClick={() => onNavigate && onNavigate('register')}>{t('Register / Sign Up')}</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
