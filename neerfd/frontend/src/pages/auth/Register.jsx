import { useState } from 'react'
import { Icon } from '../../icons/index.js'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import bgImage from '../../assets/neer_marine_bg.jpg'
import { useTranslation } from '../../i18n/translations.js'

export default function Register({ onNavigate, onRegisterSuccess }) {
  const { t } = useTranslation()
  const { register, loginAsGuest } = useAuth()
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    role: '',
    password: '',
    confirmPassword: ''
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // Basic validation
    if (!formData.name || !formData.email || !formData.mobile || !formData.role || !formData.password || !formData.confirmPassword) {
      setError(t('Please fill in all required fields.'))
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('Passwords do not match.'))
      return
    }

    if (formData.password.length < 6) {
      setError(t('Password must be at least 6 characters long.'))
      return
    }

    setLoading(true)
    try {
      const roleStr = typeof formData.role === 'string' && formData.role ? formData.role : 'fisherman'
      await register({
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        role: roleStr,
      })
      onRegisterSuccess && onRegisterSuccess(roleStr)
    } catch (err) {
      setError(err.message || t('Registration failed'))
    } finally {
      setLoading(false)
    }
  }

  const handleGuest = () => {
    loginAsGuest()
    onNavigate('landing')
  }

  const roleOptions = [
    { value: 'fisherman', label: t('Fisherman') },
    { value: 'marine', label: t('Marine / Maritime Operator') },
    { value: 'authority', label: t('Authority') }
  ]

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
              {t('Create your account')}
            </h1>
            <p className="text-neer-ocean-100 text-lg">
              {t('Join the marine intelligence platform for India.')}
            </p>
          </div>
        </div>
      </div>

      {/* Right side: Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-8 lg:p-12 relative overflow-hidden bg-slate-50">
        {/* Mobile background (faded) */}
        <div 
          className="absolute inset-0 bg-cover bg-center lg:hidden opacity-10"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
        
        <div className="w-full max-w-lg relative z-10 bg-white/90 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-neer-border shadow-neer-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <button 
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-1.5 text-sm font-medium text-neer-ink-secondary hover:text-neer-ocean-600 transition-colors mb-6"
          >
            <Icon name="chevronLeft" size={16} />
            {t('Back to Home')}
          </button>

          <h2 className="text-2xl font-bold text-neer-navy-900 mb-2">{t('Create your NEER account')}</h2>
          <p className="text-neer-ink-secondary mb-8">{t('Get a personalized marine intelligence workspace.')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('Full Name')}
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={t('e.g. Ramesh Kumar')}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('Email Address')}
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="ramesh@example.com"
                required
              />
              <Input
                label={t('Mobile Number')}
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                placeholder="+91 9999999999"
                required
              />
            </div>

            <Select
              label={t('Choose your workspace')}
              value={formData.role}
              onChange={(val) => {
                const roleValue = typeof val === 'string' ? val : (val?.target?.value || '')
                setFormData(prev => ({ ...prev, role: roleValue }))
              }}
              options={roleOptions}
              placeholder={t('Select a workspace')}
              required
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <Input
                  label={t('Password')}
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
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

              <div className="relative">
                <Input
                  label={t('Confirm Password')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-[34px] p-1 text-neer-ink-muted hover:text-neer-ocean-600 transition-colors"
                  aria-label={showConfirmPassword ? t('Hide password') : t('Show password')}
                >
                  <Icon name={showConfirmPassword ? 'eyeOff' : 'eye'} size={18} />
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 mt-4 bg-neer-unfavourable/10 border border-neer-unfavourable/20 rounded-lg flex items-start gap-2">
                <Icon name="alertTriangle" size={16} className="text-neer-unfavourable mt-2 flex-shrink-0" />
                <span className="text-sm text-neer-unfavourable font-medium">{error}</span>
              </div>
            )}

            <div className="pt-4">
              <Button type="submit" variant="primary" className="w-full justify-center" loading={loading}>
                {t('Create Account')}
              </Button>
            </div>
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
              {t('Already have an account?')} {' '}
              <button 
                onClick={() => onNavigate('login')}
                className="font-semibold text-neer-ocean-600 hover:text-neer-ocean-700 hover:underline"
              >
                {t('Login')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
