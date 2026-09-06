import React from 'react'
import { Icon } from '../../icons/index.js'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import { useTranslation } from '../../i18n/translations.js'

export default function SelectPersonaFirst({ onSelectHome }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-6 animate-fade-in">
      <Card variant="bordered" className="max-w-md w-full p-8 text-center bg-white/95 backdrop-blur-sm shadow-neer-lg border-neer-ocean-200">
        <div className="w-16 h-16 rounded-2xl bg-neer-ocean-50 text-neer-ocean-600 flex items-center justify-center mx-auto mb-5 shadow-sm">
          <Icon name="compass" size={32} />
        </div>
        
        <h2 className="text-2xl font-bold text-neer-navy-900 mb-2 tracking-tight">
          {t('Select your persona first')}
        </h2>
        
        <p className="text-neer-ink-secondary text-sm mb-6 leading-relaxed">
          {t('Please choose how you want to use NEER on the home screen to access this feature.')}
        </p>

        <Button
          variant="primary"
          icon="arrowRight"
          className="w-full justify-center py-3 text-base shadow-sm"
          onClick={onSelectHome}
        >
          {t('Click here to select your persona first')}
        </Button>
      </Card>
    </div>
  )
}
