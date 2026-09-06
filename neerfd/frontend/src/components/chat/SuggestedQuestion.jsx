/**
 * SuggestedQuestion — clickable chip showing a suggested prompt.
 */
export default function SuggestedQuestion({ text, onClick, className = '' }) {
  return (
    <button
      className={`inline-flex items-center px-3 py-2 text-neer-sm text-neer-ocean-700 bg-white border border-neer-ocean-200 rounded-full cursor-pointer whitespace-nowrap transition-all duration-neer-base ease-neer-out hover:bg-neer-ocean-50 hover:border-neer-ocean-400 active:bg-neer-ocean-100 ${className}`}
      onClick={onClick}
      type="button"
    >
      {text}
    </button>
  )
}
