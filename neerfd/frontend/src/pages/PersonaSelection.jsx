import React, { useState, useRef, useEffect } from 'react'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useTranslation } from '../i18n/translations.js'
import { Icon } from '../icons/index.js'

export default function PersonaSelection({ onSelectPersona, onNavigate, hideLanguage = false, selectedLocation }) {
  const { t } = useTranslation()
  const { language, setLanguage } = useLanguage()
  const [langDropdownOpen, setLangDropdownOpen] = useState(false)
  const langRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (langRef.current && !langRef.current.contains(event.target)) {
        setLangDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="min-h-full font-sans bg-ocean-waves text-slate-800 antialiased flex flex-col relative selection:bg-marine-100 selection:text-marine-800">
      {/* BEGIN: TopNavigationBar */}
      <header className="w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & Platform Label */}
          <div className="flex items-center space-x-3.5" data-purpose="branding">
            <button 
              type="button" 
              onClick={() => onNavigate && onNavigate('landing')} 
              className="flex items-center space-x-3 group text-left cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-sky-500 flex items-center justify-center shadow-sm group-hover:shadow transition-shadow">
                {/* Sea Wave Icon */}
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" viewBox="0 0 24 24">
                  <path d="M2 12c.6.5 1.2.5 2.5 0 2.5-1 4.5-1 7 0 2.5 1 4.5 1 7 0 1.3-.5 1.9-.5 2.5 0"></path>
                  <path d="M2 7c.6.5 1.2.5 2.5 0 2.5-1 4.5-1 7 0 2.5 1 4.5 1 7 0 1.3-.5 1.9-.5 2.5 0"></path>
                  <path d="M2 17c.6.5 1.2.5 2.5 0 2.5-1 4.5-1 7 0 2.5 1 4.5 1 7 0 1.3-.5 1.9-.5 2.5 0"></path>
                </svg>
              </div>
              <div>
                <div className="text-[9.5px] font-bold tracking-[0.14em] uppercase text-marine-600 leading-tight">
                  Marine Intelligence Platform
                </div>
                <div className="text-lg font-extrabold tracking-tight text-slate-900 leading-none mt-2">
                  NEER
                </div>
              </div>
            </button>
          </div>

          {/* Navigation Links */}
          <nav aria-label="Main Navigation" className="hidden md:flex items-center space-x-1">
            <span className="px-3.5 py-1.5 text-sm font-semibold text-sky-700 bg-sky-50 rounded-full border border-sky-200/70 cursor-default">
              Home
            </span>
            <button 
              type="button"
              onClick={() => onSelectPersona('fisherman')} 
              className="px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 rounded-full transition-colors cursor-pointer"
            >
              Map
            </button>
            <button 
              type="button"
              onClick={() => onSelectPersona('fisherman')} 
              className="px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 rounded-full transition-colors cursor-pointer"
            >
              Zones
            </button>
            <button 
              type="button"
              onClick={() => onSelectPersona('fisherman')} 
              className="px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              Alerts
              <span className="inline-flex items-center px-1.5 py-0.2 text-[11px] font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-200">1</span>
            </button>
            <button 
              type="button"
              onClick={() => onSelectPersona('fisherman')} 
              className="px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              Ask NEER
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 ring-2 ring-sky-200 animate-pulse"></span>
            </button>
          </nav>

          {/* Right Utility Controls */}
          <div className="flex items-center space-x-3">
            {/* Language Switcher */}
            <div className="relative" ref={langRef}>
              <button 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer" 
                type="button"
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              >
                <span className="text-sm">{language === 'hi' ? '🇮🇳' : '🇬🇧'}</span>
                <span>{language === 'hi' ? 'हिंदी' : 'English'}</span>
                <svg className={`w-3.5 h-3.5 text-slate-500 transition-transform ${langDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
              </button>

              {langDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-36 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden py-1">
                  <button
                    type="button"
                    onClick={() => { setLanguage('en'); setLangDropdownOpen(false) }}
                    className={`w-full flex items-center justify-between px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-sky-50 transition-colors ${language === 'en' ? 'bg-sky-50 font-semibold text-sky-700' : ''}`}
                  >
                    <span>🇬🇧 English</span>
                    {language === 'en' && <Icon name="check" size={14} className="text-sky-600" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLanguage('hi'); setLangDropdownOpen(false) }}
                    className={`w-full flex items-center justify-between px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-sky-50 transition-colors ${language === 'hi' ? 'bg-sky-50 font-semibold text-sky-700' : ''}`}
                  >
                    <span>🇮🇳 हिंदी</span>
                    {language === 'hi' && <Icon name="check" size={14} className="text-sky-600" />}
                  </button>
                </div>
              )}
            </div>

            {/* Live Telemetry / Location Status */}
            <div className="hidden lg:inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
              <span className={`w-2 h-2 rounded-full ${selectedLocation?.isDetecting ? 'bg-sky-500 animate-pulse' : selectedLocation?.isCoastal === false ? 'bg-amber-500' : 'bg-emerald-500 status-ping'}`}></span>
              <span className="text-slate-500">{selectedLocation?.isDetecting ? t('GPS / IP:') : selectedLocation?.isCoastal === false ? t('Region:') : t('Sector:')}</span>
              <span className="font-semibold text-slate-800">{selectedLocation?.isDetecting ? t('Detecting location...') : (selectedLocation?.name || t('Coastal Waters'))}</span>
            </div>

            {/* User Profile Avatar / Login Pill */}
            <button 
              aria-label="User profile" 
              onClick={() => onNavigate && onNavigate('login')}
              className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer" 
              type="button"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </button>
          </div>
        </div>
      </header>
      {/* END: TopNavigationBar */}

      {/* BEGIN: MainContent */}
      <main className="flex-1 max-w-screen-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 flex flex-col justify-between wave-line-pattern">
        {/* Hero / Workspace Header */}
        <div className="text-center pt-4 pb-8 max-w-3xl mx-auto" data-purpose="hero-section">
          {/* Floating Emblem */}
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white border border-sky-100 shadow-md shadow-sky-500/5 mb-5 group">
            <svg className="w-7 h-7 text-marine-600 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
              <path d="M2 12c.6.5 1.2.5 2.5 0 2.5-1 4.5-1 7 0 2.5 1 4.5 1 7 0 1.3-.5 1.9-.5 2.5 0"></path>
              <path d="M2 8c.6.5 1.2.5 2.5 0 2.5-1 4.5-1 7 0 2.5 1 4.5 1 7 0 1.3-.5 1.9-.5 2.5 0"></path>
              <path d="M2 16c.6.5 1.2.5 2.5 0 2.5-1 4.5-1 7 0 2.5 1 4.5 1 7 0 1.3-.5 1.9-.5 2.5 0"></path>
            </svg>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 uppercase leading-none">
            NEER
          </h1>
          <p className="text-sm sm:text-base font-bold tracking-[0.18em] uppercase text-marine-600 mt-2.5">
            MARINE INTELLIGENCE FOR INDIA
          </p>
          <p className="text-base sm:text-lg text-slate-600 mt-4 font-normal max-w-xl mx-auto">
            Choose how you want to use NEER. Select your workspace to access tailored satellite feeds, coastal safety metrics, and operational tools.
          </p>
        </div>

        {/* BEGIN: WorkspaceCardsGrid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto w-full my-3" data-purpose="workspace-selector">
          {/* CARD 1: Fisherman */}
          <div 
            onClick={() => onSelectPersona('fisherman')}
            className="group relative bg-white rounded-2xl p-7 border border-slate-200/90 shadow-subtle hover:shadow-card-hover hover:border-sky-300 transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer text-left"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-transparent group-hover:bg-gradient-to-r from-sky-400 to-cyan-500 transition-all duration-300"></div>
            <div>
              {/* Icon Container */}
              <div className="w-14 h-14 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-marine-600 group-hover:bg-marine-600 group-hover:text-white transition-colors duration-300 mb-5">
                {/* Fishing Hook / Marine Fauna Vector */}
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M16 4v8a4 4 0 0 1-8 0V8"></path>
                  <circle cx="16" cy="4" r="2"></circle>
                  <path d="M6 10l2 2"></path>
                  <path d="M18 18c-2 2-6 2-8 0"></path>
                </svg>
              </div>
              {/* Titles */}
              <h2 className="text-2xl font-bold text-slate-900 group-hover:text-marine-700 transition-colors">
                Fisherman
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-2 mb-3">
                मछुआरा
              </p>
              {/* Description */}
              <p className="text-sm text-slate-600 leading-relaxed">
                Marine conditions, Potential Fishing Zones (PFZ), high swell advisory, live sea state &amp; safety alerts.
              </p>
              {/* Badges */}
              <div className="flex flex-wrap gap-2 mt-5">
                <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                  Live PFZ
                </span>
                <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-50 text-slate-700 border border-slate-200">
                  Safety Score
                </span>
                <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 text-amber-700 border border-amber-200/80">
                  Swell Alerts
                </span>
              </div>
            </div>
            {/* Footer Action */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-marine-600 group-hover:text-marine-700 uppercase tracking-wider">
              <span>Enter Workspace</span>
              <svg className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </div>
          </div>

          {/* CARD 2: Marine Operator (Featured / Default Focus) */}
          <div 
            onClick={() => onSelectPersona('marine')}
            className="group relative bg-white rounded-2xl p-7 border border-slate-200/90 shadow-subtle hover:shadow-card-hover hover:border-sky-300 transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer text-left"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-transparent group-hover:bg-gradient-to-r from-sky-400 to-cyan-500 transition-all duration-300"></div>
            <div className="absolute top-3.5 right-3.5">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-marine-700 border border-sky-200">
                Commercial
              </span>
            </div>
            <div>
              {/* Icon Container */}
              <div className="w-14 h-14 rounded-xl bg-marine-50 border border-sky-200 flex items-center justify-center text-marine-600 group-hover:bg-marine-600 group-hover:text-white transition-colors duration-300 mb-5">
                {/* Map Nautical Route Vector */}
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                  <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
                  <line x1="9" x2="9" y1="3" y2="18"></line>
                  <line x1="15" x2="15" y1="6" y2="21"></line>
                </svg>
              </div>
              {/* Titles */}
              <h2 className="text-2xl font-bold text-slate-900 group-hover:text-marine-700 transition-colors">
                Marine
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-2 mb-3">
                मरीन / समुद्री संचालन
              </p>
              {/* Description */}
              <p className="text-sm text-slate-600 leading-relaxed">
                Route and voyage condition assessment, vessel-specific wave resistance windows &amp; commercial maritime transit.
              </p>
              {/* Badges */}
              <div className="flex flex-wrap gap-2 mt-5">
                <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md bg-sky-50 text-sky-800 border border-sky-200/80">
                  Voyage Risk Review
                </span>
                <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-50 text-slate-700 border border-slate-200">
                  Waypoints &amp; Wind
                </span>
                <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-50 text-slate-700 border border-slate-200">
                  Segment Monitor
                </span>
              </div>
            </div>
            {/* Footer Action */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-marine-600 group-hover:text-marine-700 uppercase tracking-wider">
              <span>Enter Workspace</span>
              <svg className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </div>
          </div>

          {/* CARD 3: Coastal Authority */}
          <div 
            onClick={() => onSelectPersona('authority')}
            className="group relative bg-white rounded-2xl p-7 border border-slate-200/90 shadow-subtle hover:shadow-card-hover hover:border-sky-300 transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer text-left"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-transparent group-hover:bg-gradient-to-r from-sky-400 to-cyan-500 transition-all duration-300"></div>
            <div>
              {/* Icon Container */}
              <div className="w-14 h-14 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-marine-600 group-hover:bg-marine-600 group-hover:text-white transition-colors duration-300 mb-5">
                {/* Coastal Shield / Globe Vector */}
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  <path d="M2 12h20"></path>
                </svg>
              </div>
              {/* Titles */}
              <h2 className="text-2xl font-bold text-slate-900 group-hover:text-marine-700 transition-colors">
                Authority
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-2 mb-3">
                प्राधिकरण
              </p>
              {/* Description */}
              <p className="text-sm text-slate-600 leading-relaxed">
                Regional risk and coastal monitoring, broadcast hazard dispatch, INCOIS sync &amp; port zone surveillance.
              </p>
              {/* Badges */}
              <div className="flex flex-wrap gap-2 mt-5">
                <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                  Coastal Grid
                </span>
                <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-50 text-slate-700 border border-slate-200">
                  Draft Broadcasts
                </span>
                <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-50 text-slate-700 border border-slate-200">
                  Hazard Feeds
                </span>
              </div>
            </div>
            {/* Footer Action */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-marine-600 group-hover:text-marine-700 uppercase tracking-wider">
              <span>Enter Workspace</span>
              <svg className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </div>
          </div>
        </div>
        {/* END: WorkspaceCardsGrid */}

        {/* BEGIN: Auth Options Row */}
        <div className="max-w-xl mx-auto w-full mt-6 mb-2 text-center" data-purpose="auth-options">
          <div className="inline-flex flex-wrap items-center justify-center gap-6 px-6 py-3 bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/80 text-xs sm:text-sm text-slate-600 shadow-sm">
            <div>
              <span>Already have an account? </span>
              <button 
                type="button"
                onClick={() => onNavigate && onNavigate('login')} 
                className="font-semibold text-marine-600 hover:text-marine-700 hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </div>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <div>
              <span>New to NEER? </span>
              <button 
                type="button"
                onClick={() => onNavigate && onNavigate('register')} 
                className="font-semibold text-marine-600 hover:text-marine-700 hover:underline cursor-pointer"
              >
                Create an account
              </button>
            </div>
          </div>
        </div>
        {/* END: Auth Options Row */}
      </main>
      {/* END: MainContent */}

      {/* BEGIN: FloatingChatWidget */}
      <aside className="fixed bottom-6 right-6 z-50" data-purpose="floating-assistant">
        <button 
          onClick={() => onSelectPersona('fisherman')}
          className="group flex items-center gap-2.5 px-4 py-2.5 bg-[#0b1626] text-white rounded-full shadow-float hover:bg-slate-800 transition-all border border-slate-700/50 hover:scale-[1.02] cursor-pointer" 
          type="button"
        >
          {/* Chat Icon */}
          <svg className="w-4 h-4 text-sky-400 group-hover:rotate-6 transition-transform" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span className="text-sm font-semibold tracking-wide">Ask NEER</span>
          {/* Online Status Dot */}
          <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0b1626]"></span>
        </button>
      </aside>
      {/* END: FloatingChatWidget */}

      {/* BEGIN: SiteFooter */}
      <footer className="w-full border-t border-slate-200/80 bg-white/70 backdrop-blur-sm py-4 text-center text-xs text-slate-500">
        <div className="max-w-screen-2xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>© 2025 NEER Marine Intelligence Platform. Ministry of Earth Sciences &amp; INCOIS data integration.</div>
          <div className="flex items-center space-x-4">
            <span className="hover:text-slate-700 underline underline-offset-2 cursor-pointer">Coastal Safety Index</span>
            <span className="hover:text-slate-700 underline underline-offset-2 cursor-pointer">Privacy &amp; Protocol</span>
            <span className="hover:text-slate-700 underline underline-offset-2 cursor-pointer">API Feeds</span>
          </div>
        </div>
      </footer>
      {/* END: SiteFooter */}
    </div>
  )
}
