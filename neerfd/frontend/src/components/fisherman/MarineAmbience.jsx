import { useTranslation } from '../../i18n/translations.js';
/**
 * MarineAmbience — refined: predominantly light ocean atmosphere.
 *
 * Background is clean and light, but fish are now clearly visible
 * while remaining behind the UI.
 */
export default function MarineAmbience({ className = '' }) {
  const { t } = useTranslation()

  return (
    <div
      className={`fixed inset-0 pointer-events-none -z-10 bg-topo-pattern overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <div className="fixed top-0 left-0 right-0 h-96 pointer-events-none hero-orbit-glow" />
    </div>
  )
}
