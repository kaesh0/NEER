import React, { useState } from 'react'
import FallbackNotice from '../ui/FallbackNotice.jsx'
import { LogoIcon } from '../ui/Logo.jsx'
import { Icon } from '../../icons/index.js'

/**
 * MessageBubble — single chat message with maritime styling.
 * Supports both:
 *  - <MessageBubble message={m} />
 *  - <MessageBubble role={m.role} text={m.text} ... />
 */
export default function MessageBubble({
  message,
  role = message?.role || 'assistant',
  name = message?.name,
  text = message?.text,
  time = message?.time,
  isFallback = message?.isFallback || false,
  isError = message?.isError || false,
  status = message?.status,
  className = '',
}) {
  const [copied, setCopied] = useState(false)
  const isUser = role === 'user'
  const displayName = name || (isUser ? 'You' : 'NEER Copilot')

  // Derive message text safely
  const messageContent = typeof text === 'string'
    ? text
    : typeof message?.text === 'string'
    ? message.text
    : ''

  const handleCopy = () => {
    if (!messageContent) return
    navigator.clipboard?.writeText(messageContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Determine status badge if present
  let statusBadge = null
  if (status === 'favourable') {
    statusBadge = (
      <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        Favourable
      </span>
    )
  } else if (status === 'caution') {
    statusBadge = (
      <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        Caution
      </span>
    )
  } else if (status === 'unfavourable') {
    statusBadge = (
      <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
        Unfavourable
      </span>
    )
  }

  return (
    <div className={`flex gap-2.5 max-w-[90%] md:max-w-[82%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'} animate-message-in ${className}`}>
      {/* Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        {isUser ? (
          <div className="w-7 h-7 rounded-full bg-neer-navy-800 text-white flex items-center justify-center text-xs font-semibold shadow-xs">
            <Icon name="user" size={14} />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-neer-navy-900 border border-neer-ocean-500/40 flex items-center justify-center shadow-xs">
            <LogoIcon size={18} />
          </div>
        )}
      </div>

      {/* Bubble Container */}
      <div className="flex flex-col flex-1 min-w-0">
        {isFallback && !isUser && (
          <FallbackNotice compact className="mb-1.5 w-full" />
        )}

        <div
          className={`relative px-4 py-3 rounded-2xl leading-relaxed text-sm shadow-2xs ${
            isUser
              ? 'bg-neer-navy-900 text-white rounded-tr-xs'
              : isError
              ? 'bg-rose-50 border border-rose-200 text-rose-900 rounded-tl-xs'
              : 'bg-white text-neer-navy-900 border border-neer-border/90 rounded-tl-xs hover:border-neer-ocean-300 transition-colors'
          }`}
        >
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className={`text-[0.7rem] font-bold uppercase tracking-wider ${isUser ? 'text-neer-ocean-300' : 'text-neer-ocean-700'}`}>
              {displayName}
            </span>
            <div className="flex items-center gap-1.5">
              {!isUser && statusBadge}
              {time && (
                <span className={`text-[0.65rem] ${isUser ? 'text-white/60' : 'text-neer-ink-muted'}`}>
                  {time}
                </span>
              )}
            </div>
          </div>

          {/* Message Text */}
          <div className="whitespace-pre-wrap font-sans break-words leading-relaxed">
            {messageContent || (
              <span className="text-neer-ink-muted italic">
                {isUser ? '...' : 'Assessment unavailable.'}
              </span>
            )}
          </div>

          {/* Footer Actions (Assistant Only) */}
          {!isUser && messageContent && !isError && (
            <div className="flex items-center justify-end gap-1 mt-2 pt-1.5 border-t border-neer-border/40 text-[0.7rem] text-neer-ink-muted">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-neer-surface hover:text-neer-navy-900 transition-colors"
                title="Copy response"
              >
                <Icon name={copied ? 'check' : 'copy'} size={12} className={copied ? 'text-emerald-600' : ''} />
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
