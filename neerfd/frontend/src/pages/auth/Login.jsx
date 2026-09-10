import React, { useState } from 'react'
import { Icon } from '../../icons/index.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTranslation } from '../../i18n/translations.js'
import loginFishermanBg from '../../assets/login_fisherman_bg.jpg'

export default function Login({ onNavigate, onLoginSuccess }) {
  const { t } = useTranslation()
  const { login, loginAsGuest } = useAuth()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('') // 'fisherman', 'operator', 'authority'
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!email || !password) {
      setError(t('Please enter both email and password.'))
      return
    }

    setLoading(true)
    try {
      const targetRole = role === 'operator' ? 'marine' : role
      const loggedUser = await login(email, password, targetRole)
      onLoginSuccess && onLoginSuccess(loggedUser?.role || targetRole)
    } catch (err) {
      setError(err.message || t('Login failed'))
    } finally {
      setLoading(false)
    }
  }

  const handleGuest = () => {
    loginAsGuest()
    onLoginSuccess && onLoginSuccess(null)
  }

  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row font-sans bg-slate-50 text-slate-800 antialiased overflow-x-hidden selection:bg-sky-200 selection:text-sky-900">
      {/* LEFT SIDE: High-fidelity Maritime Photography with Deep Gradient Scrim */}
      <section className="relative w-full lg:w-[48%] xl:w-[50%] flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden min-h-[460px] lg:min-h-screen" data-purpose="editorial-marine-visual">
        {/* Authentic Marine Photography Background */}
        <div className="absolute inset-0 z-0">
          <img 
            alt="Traditional fishing boat on calm coastal waters" 
            className="w-full h-full object-cover object-center transform scale-105 transition-transform duration-1000 ease-out" 
            src={loginFishermanBg}
          />
          {/* Deep ocean gradient scrim & atmospheric mood */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#061325] via-[#092244]/80 to-[#040f1d]/75 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#061325]/90 via-[#071d3a]/60 to-transparent"></div>
        </div>

        {/* Top Header: Brand Emblem & Wordmark */}
        <header className="relative z-10 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-lg text-sky-300">
            <svg className="w-6 h-6 stroke-[2.2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 15c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3M3 9c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          </div>
          <div>
            <span className="text-2xl font-bold tracking-wider text-white font-heading">NEER</span>
            <span className="block text-[11px] font-medium tracking-widest text-sky-200/80 uppercase">Ocean Platform</span>
          </div>
        </header>

        {/* Center Content: Editorial Statement */}
        <div className="relative z-10 my-auto py-12 lg:py-0 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sky-200 text-xs font-medium mb-6 backdrop-blur-sm">
            <span>Connected Oceans</span>
          </div>
          <h1 className="text-3xl sm:text-4xl xl:text-5xl font-bold text-white font-heading tracking-tight leading-[1.18] mb-5">
            Marine Intelligence Platform
          </h1>
          <p className="text-slate-200 text-base sm:text-lg font-normal leading-relaxed text-balance">
            Empowering coastal communities, fishermen, and maritime operators with clear, timely sea insights.
          </p>
        </div>

        {/* Bottom: Quiet Place Caption & Subtle Language Indicator */}
        <footer className="relative z-10 flex items-center justify-between pt-6 border-t border-white/15 text-xs text-sky-200/75">
          <div className="flex items-center gap-2">
            <Icon name="mapPin" size={14} className="text-sky-300" />
            <span className="tracking-wide">Indian Ocean & Maritime Waters</span>
          </div>
          <div className="flex items-center gap-2.5 text-sky-200/60 font-medium">
            <span>English</span>
            <span>•</span>
            <span>हिंदी</span>
            <span>•</span>
            <span>தமிழ்</span>
            <span>•</span>
            <span>বাংলা</span>
          </div>
        </footer>
      </section>

      {/* RIGHT SIDE: Clean, Spacious, Off-white Surface with Auth Container */}
      <section className="w-full lg:w-[52%] xl:w-[50%] flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-slate-50" data-purpose="auth-content-container">
        {/* Elevated Auth Card with smooth fade-in */}
        <div className="w-full max-w-[480px] bg-white rounded-3xl p-8 sm:p-10 shadow-[0_12px_40px_-12px_rgba(11,25,46,0.08)] border border-slate-100 animate-fade-in-up">
          {/* Continue as guest top shortcut removed */}

          {/* Heading & Greeting */}
          <div className="mb-7">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading tracking-tight mb-2">Welcome</h2>
            <p className="text-slate-500 text-sm">Sign in to access your marine intelligence workspace</p>
          </div>

          {/* BEGIN: Sign In Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Role Selector: Clean Pill Buttons */}
            <div className="space-y-2" data-purpose="role-selector">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Select your role
              </label>
              <div className="grid grid-cols-3 gap-2">
                {/* Option 1: Fisherman */}
                <button
                  type="button"
                  onClick={() => setRole('fisherman')}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-xs font-medium transition-all text-center gap-1.5 select-none cursor-pointer group ${
                    role === 'fisherman'
                      ? 'border-[#0284c7] bg-[#f0f9ff] text-[#0369a1] shadow-sm font-semibold'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-[#0284c7] hover:bg-[#f0f9ff] hover:text-[#0369a1]'
                  }`}
                >
                  <Icon name="fish" size={16} className={role === 'fisherman' ? 'text-[#0284c7]' : 'text-slate-500 group-hover:text-[#0284c7] transition-colors'} />
                  <span>Fisherman</span>
                </button>

                {/* Option 2: Marine Operator */}
                <button
                  type="button"
                  onClick={() => setRole('operator')}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-xs font-medium transition-all text-center gap-1.5 select-none cursor-pointer group ${
                    role === 'operator'
                      ? 'border-[#0284c7] bg-[#f0f9ff] text-[#0369a1] shadow-sm font-semibold'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-[#0284c7] hover:bg-[#f0f9ff] hover:text-[#0369a1]'
                  }`}
                >
                  <Icon name="boat" size={16} className={role === 'operator' ? 'text-[#0284c7]' : 'text-slate-500 group-hover:text-[#0284c7] transition-colors'} />
                  <span>Operator</span>
                </button>

                {/* Option 3: Coastal Authority */}
                <button
                  type="button"
                  onClick={() => setRole('authority')}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-xs font-medium transition-all text-center gap-1.5 select-none cursor-pointer group ${
                    role === 'authority'
                      ? 'border-[#0284c7] bg-[#f0f9ff] text-[#0369a1] shadow-sm font-semibold'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-[#0284c7] hover:bg-[#f0f9ff] hover:text-[#0369a1]'
                  }`}
                >
                  <Icon name="shield" size={16} className={role === 'authority' ? 'text-[#0284c7]' : 'text-slate-500 group-hover:text-[#0284c7] transition-colors'} />
                  <span>Authority</span>
                </button>
              </div>
            </div>

            {/* Email / Mobile Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600" htmlFor="identifier">
                Email / Mobile
              </label>
              <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-sky-600 focus-within:ring-2 focus-within:ring-sky-100 transition-all">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Icon name="user" size={16} />
                </div>
                <input 
                  autoComplete="username" 
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-transparent text-sm text-slate-800 placeholder:text-slate-400 border-0 focus:ring-0 focus:outline-none" 
                  id="identifier" 
                  placeholder="Enter email or phone number" 
                  required 
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600" htmlFor="password">
                  Password
                </label>
                <button type="button" className="text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline transition-colors">
                  Forgot password?
                </button>
              </div>
              <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-sky-600 focus-within:ring-2 focus-within:ring-sky-100 transition-all">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Icon name="lock" size={16} />
                </div>
                <input 
                  autoComplete="current-password" 
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-transparent text-sm text-slate-800 placeholder:text-slate-400 border-0 focus:ring-0 focus:outline-none" 
                  id="password" 
                  placeholder="••••••••" 
                  required 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {/* Password visibility toggle */}
                <button 
                  aria-label="Toggle password visibility" 
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer" 
                  onClick={() => setShowPassword(!showPassword)} 
                  type="button"
                >
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={16} />
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
                <Icon name="alertTriangle" size={16} className="text-red-500 mt-2 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Primary Sign In Action Button */}
            <div className="pt-2">
              <button 
                className="w-full py-3.5 px-6 rounded-xl font-medium text-sm text-white bg-[#0b192e] hover:bg-[#003351] active:scale-[0.99] transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 cursor-pointer disabled:opacity-50" 
                disabled={loading}
                type="submit"
              >
                <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                <Icon name="arrowRight" size={16} className="text-sky-400 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </form>
          {/* END: Sign In Form */}

          {/* Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-xs uppercase tracking-wider text-slate-400 font-medium absolute">or</span>
          </div>

          {/* Secondary Action: Continue as Guest */}
          <div>
            <button 
              className="w-full py-3 px-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-all duration-150 flex items-center justify-center gap-2 group active:scale-[0.99] cursor-pointer" 
              onClick={handleGuest} 
              type="button"
            >
              <Icon name="compass" size={16} className="text-sky-600 group-hover:rotate-45 transition-transform duration-300" />
              <span>Continue as Guest</span>
            </button>
          </div>

          {/* Registration Link */}
          <div className="mt-7 text-center">
            <p className="text-xs sm:text-sm text-slate-500">
              Don't have an account? 
              <button 
                type="button"
                onClick={() => onNavigate && onNavigate('register')}
                className="font-semibold text-sky-600 hover:text-sky-700 hover:underline transition-colors ml-1 cursor-pointer"
              >
                Create an account
              </button>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
