import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../i18n/translations.js';

/**
 * Reveal — wraps children and fades them in when they enter the viewport.
 * Uses .neer-reveal / .neer-reveal--in classes defined in index.css.
 */
export default function Reveal({
  delay = 0,
  direction = 'up',
  threshold = 0.15,
  className = '',
  children,
}) {
  const { t } = useTranslation()

  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return (
    <div
      ref={ref}
      className={`neer-reveal ${visible ? 'neer-reveal--in' : ''} ${direction === 'left' ? '-translate-x-2.5' : ''} ${className}`.trim()}
      style={{ '--neer-reveal-delay': `${delay}ms` }}
    >
      {children}
    </div>
  )
}
