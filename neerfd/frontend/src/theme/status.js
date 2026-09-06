/**
 * NEER Status Metadata
 *
 * Status language: Favourable / Caution / Unfavourable / Unavailable.
 * Never use "Safe" or "Unsafe".
 */

export const STATUS = {
  favourable: {
    label: 'Favourable',
    description: 'Conditions are suitable for normal operations.',
    cssPrefix: '--neer-status-favourable',
    dotColor: 'var(--neer-status-favourable-strong)',
    icon: 'checkCircle',
  },
  caution: {
    label: 'Caution',
    description: 'Be alert. Conditions may change.',
    cssPrefix: '--neer-status-caution',
    dotColor: 'var(--neer-status-caution-strong)',
    icon: 'alertTriangle',
  },
  unfavourable: {
    label: 'Unfavourable',
    description: 'Conditions are not suitable. Avoid operations.',
    cssPrefix: '--neer-status-unfavourable',
    dotColor: 'var(--neer-status-unfavourable-strong)',
    icon: 'xCircle',
  },
  unavailable: {
    label: 'Unavailable',
    description: 'Data is currently not available.',
    cssPrefix: '--neer-status-unavailable',
    dotColor: 'var(--neer-status-unavailable-strong)',
    icon: 'questionCircle',
  },
  info: {
    label: 'Info',
    description: 'General information.',
    cssPrefix: '--neer-info',
    dotColor: 'var(--neer-info-fg)',
    icon: 'info',
  },
}

export const STATUS_LIST = Object.keys(STATUS)
