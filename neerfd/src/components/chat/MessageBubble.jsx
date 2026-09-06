/**
 * MessageBubble — single chat message. Fallback state is signalled once by the
 * modal-level banner, not per message.
 */
export default function MessageBubble({
  role = 'assistant',
  name,
  text,
  time,
  isFallback = false,
  className = '',
}) {
  const isUser = role === 'user'
  const displayName = name || (isUser ? 'You' : 'NEER')

  return (
    <div className={`flex flex-col max-w-[85%] ${isUser ? 'self-end items-end' : 'self-start items-start'} ${className}`}>
      <div className={`px-4 py-3 text-neer-base leading-relaxed ${
        isUser
          ? 'bg-neer-navy-900 text-white rounded-2xl rounded-br-sm'
          : 'bg-neer-surface-alt text-neer-ink border border-neer-border rounded-2xl rounded-bl-sm'
      }`}>
        <div className="text-neer-xs font-semibold opacity-70 mb-1 uppercase tracking-[0.06em]">{displayName}</div>
        <div className="whitespace-pre-wrap">{text}</div>
        {time && <div className="text-neer-xs opacity-50 mt-1">{time}</div>}
      </div>
    </div>
  )
}
