import { useTranslation } from '../../i18n/translations.js';
export default function AuthorityMapAmbience() {
  const { t } = useTranslation()

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] bg-[#f1f5f9] overflow-hidden">
      {/* Abstract geospatial lines */}
      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #94a3b8 10px, #94a3b8 11px)' }} />
      
      <div className="absolute inset-0 bg-gradient-to-r from-neer-surface-sunken to-transparent opacity-80" />
      <div className="absolute right-0 bottom-0 w-[50%] h-[50%] bg-neer-ocean-100 rounded-tl-full opacity-20 blur-3xl" />
      
      {/* Data crosshairs */}
      <div className="absolute left-[15%] top-[25%] w-10 h-10 border border-neer-navy-900 opacity-[0.1] flex items-center justify-center">
        <div className="w-1 h-1 bg-neer-navy-900" />
      </div>
    </div>
  )
}
