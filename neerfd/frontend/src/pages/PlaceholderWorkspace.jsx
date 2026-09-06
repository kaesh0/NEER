import { Icon } from '../icons/index.js'
import Button from '../components/ui/Button.jsx'

export default function PlaceholderWorkspace({ persona, onGoBack }) {
  const titles = {
    marine: 'Marine / Maritime Operator Workspace',
    authority: 'Authority Workspace'
  }

  return (
    <div className="flex flex-col items-center justify-center py-32 text-center gap-4 px-4">
      <div className="w-16 h-16 rounded-full bg-neer-ocean-50 flex items-center justify-center mb-2">
        <Icon name={persona === 'marine' ? 'map' : 'globe'} size={32} className="text-neer-ocean-600" />
      </div>
      <h2 className="text-2xl font-bold text-neer-navy-900">{titles[persona] || 'Workspace'}</h2>
      <p className="text-neer-ink-secondary max-w-md mx-auto mb-4">
        This workspace is currently under development. The full marine intelligence capabilities for this persona will be available soon.
      </p>
      <Button variant="secondary" icon="arrowLeft" onClick={onGoBack}>
        Back to persona selection
      </Button>
    </div>
  )
}
