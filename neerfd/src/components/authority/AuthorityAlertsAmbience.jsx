import { useTranslation } from '../../i18n/translations.js';
export default function AuthorityAlertsAmbience() {
  const { t } = useTranslation()

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] bg-[#f8fafc] overflow-hidden">
      {/* Warning/response center feel */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full border-4 border-neer-caution opacity-[0.02] -translate-y-1/2 translate-x-1/4" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full border-2 border-neer-caution opacity-[0.03] -translate-y-1/2 translate-x-1/4" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full border border-neer-caution opacity-[0.04] -translate-y-1/2 translate-x-1/4" />
      
      {/* Diagonal hazard-like stripes in the background */}
      <div className="absolute left-0 bottom-0 w-full h-32 opacity-[0.02]" style={{ backgroundImage: 'repeating-linear-gradient(-45deg, #0f172a, #0f172a 10px, transparent 10px, transparent 20px)' }} />
      
      <div className="absolute inset-0 bg-gradient-to-t from-[#f8fafc] to-transparent opacity-90" />
    </div>
  )
}
