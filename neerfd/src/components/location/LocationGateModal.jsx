import { useState } from 'react'
import { Icon } from '../../icons/index.js'
import Button from '../ui/Button.jsx'
import LocationPicker from './LocationPicker.jsx'
import { useTranslation } from '../../i18n/translations.js'

/**
 * LocationGateModal — asks for the user's coastal location before entering a
 * workspace. Used for guests (who have no Register page) and whenever the
 * header location chip is clicked to change the location.
 */
export default function LocationGateModal({ current, onSave, onSkip, skippable = true }) {
  const { t } = useTranslation()
  const [location, setLocation] = useState(current || null)
  const [error, setError] = useState('')

  const handleSave = () => {
    if (!location) {
      setError(t('Please set your location so NEER can assess your waters.'))
      return
    }
    onSave && onSave(location)
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0" onClick={skippable ? onSkip : undefined} aria-hidden="true" />
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-neer-lg overflow-hidden z-10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-gate-title"
      >
        <div className="bg-neer-navy-900 text-white p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neer-ocean-600 flex items-center justify-center flex-shrink-0">
              <Icon name="location" size={20} />
            </div>
            <div>
              <div id="location-gate-title" className="font-bold">{t('Set your location')}</div>
              <div className="text-neer-xs opacity-75">{t('NEER tailors sea conditions, zones and alerts to your waters.')}</div>
            </div>
          </div>
        </div>

        <div className="p-5">
          <LocationPicker
            id="location-gate-input"
            value={location}
            onChange={(loc) => {
              setLocation(loc)
              setError('')
            }}
          />
          {error && (
            <div className="mt-3 p-2.5 bg-neer-unfavourable/10 border border-neer-unfavourable/20 rounded-lg flex items-start gap-2">
              <Icon name="alertTriangle" size={14} className="text-neer-unfavourable mt-0.5 flex-shrink-0" />
              <span className="text-xs text-neer-unfavourable font-medium">{error}</span>
            </div>
          )}
          <div className="mt-4">
            <Button variant="primary" className="w-full justify-center" onClick={handleSave}>
              {t('Save location')}
            </Button>
          </div>
          {skippable && onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="w-full text-center text-neer-xs text-neer-ink-muted hover:text-neer-ink-secondary mt-3 transition-colors"
            >
              {t('Skip for now')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
