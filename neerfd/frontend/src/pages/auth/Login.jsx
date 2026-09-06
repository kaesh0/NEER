import { useState } from 'react'
import { Icon } from '../../icons/index.js'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import bgImage from '../../assets/neer_marine_bg.jpg'
import { useTranslation } from '../../i18n/translations.js'

export default function Login({ onNavigate, onLoginSuccess }) {
  const { t } = useTranslation()
  const { login, loginAsGuest } = useAuth()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [persona, setPersona] = useState('fisherman')
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
      const loggedUser = await login(email, password, persona)
      const targetRole = loggedUser?.role || persona
      onLoginSuccess && onLoginSuccess(targetRole)
    } catch (err) {
      setError(err.message || t('Login failed'))
    } finally {
      setLoading(false)
    }
  }

  const handleGuest = () => {
    loginAsGuest()
    onNavigate('landing')
  }

  return (
    <div className="relative min-h-screen bg-neer-navy-900 flex">
      {/* Left side: Premium Background */}
      <div className="hidden lg:block lg:w-1/2 relative bg-neer-navy-950">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-80 mix-blend-luminosity"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-neer-navy-900/60 to-neer-navy-900/90" />
        <div className="absolute inset-0 flex flex-col justify-between p-12">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 bg-neer-ocean-600 rounded-xl flex items-center justify-center shadow-lg">
              <Icon name="wave" size={24} className="text-white" />
            </div>
            <span className="text-2xl font-black text-white tracking-tight">NEER</span>
          </div>
          <div className="max-w-md">
            <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
              {t('Marine Intelligence for India')}
            </h1>
            <p className="text-neer-ocean-100 text-lg">
              {t('One platform for fishermen, maritime operators, and coastal authorities.')}
            </p>
          </div>
        </div>
      </div>

      {/* Right side: Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative overflow-hidden bg-slate-50">
        {/* Mobile background (faded) */}
        <div 
          className="absolute inset-0 bg-cover bg-center lg:hidden opacity-10"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
        
        <div className="w-full max-w-md relative z-10 bg-white/90 backdrop-blur-md p-8 rounded-2xl border border-neer-border shadow-neer-xl">
          <button 
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-1.5 text-sm font-medium text-neer-ink-secondary hover:text-neer-ocean-600 transition-colors mb-8"
          >
            <Icon name="chevronLeft" size={16} />
            {t('Back to Home')}
          </button>

          <h2 className="text-2xl font-bold text-neer-navy-900 mb-2">{t('Welcome back')}</h2>
          <p className="text-neer-ink-secondary mb-8">{t('Access your marine intelligence workspace.')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('Email / Mobile')}
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('Enter your email or mobile')}
              required
            />
            
            <div className="relative">
              <Input
                label={t('Password')}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[34px] p-1 text-neer-ink-muted hover:text-neer-ocean-600 transition-colors"
                aria-label={showPassword ? t('Hide password') : t('Show password')}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
              </button>
            </div>

            <div className="flex justify-end pt-1">
              <button type="button" className="text-sm font-medium text-neer-ocean-600 hover:text-neer-ocean-700">
                {t('Forgot password?')}
              </button>
            </div>

            <Select
              label={t('Choose your workspace')}
              name="persona"
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              options={[
                { value: 'fisherman', label: t('Fisherman') },
                { value: 'marine', label: t('Marine / Maritime Operator') },
                { value: 'authority', label: t('Authority') }
              ]}
            />

            {error && (
              <div className="p-3 bg-neer-unfavourable/10 border border-neer-unfavourable/20 rounded-lg flex items-start gap-2">
                <Icon name="alertTriangle" size={16} className="text-neer-unfavourable mt-0.5 flex-shrink-0" />
                <span className="text-sm text-neer-unfavourable font-medium">{error}</span>
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full justify-center mt-2" loading={loading}>
              {t('Login')}
            </Button>
          </form>

          <div className="mt-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-neer-border" />
            <span className="text-sm text-neer-ink-muted">{t('or')}</span>
            <div className="flex-1 h-px bg-neer-border" />
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Button type="button" variant="secondary" className="w-full justify-center" onClick={handleGuest}>
              {t('Continue as Guest')}
            </Button>
            
            <p className="text-center text-sm text-neer-ink-secondary mt-2">
              {t('Don\'t have an account?')} {' '}
              <button 
                onClick={() => onNavigate('register')}
                className="font-semibold text-neer-ocean-600 hover:text-neer-ocean-700 hover:underline"
              >
                {t('Create an account')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
