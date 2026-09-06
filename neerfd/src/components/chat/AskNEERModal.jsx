import React, { useState, useRef, useEffect } from 'react'
import { Icon } from '../../icons/index.js'
import Input from '../ui/Input.jsx'
import IconButton from '../ui/IconButton.jsx'
import MessageBubble from './MessageBubble.jsx'
import SuggestedQuestion from './SuggestedQuestion.jsx'

// Data imports for mocked responses (marine persona only)
import { decision as mDecision } from '../../data/mock/marineData.js'
import { useTranslation } from '../../i18n/translations.js'
import { useLanguage } from '../../context/LanguageContext.jsx'
import { useHomeLocation } from '../../context/LocationContext.jsx'

export default function AskNEERModal({ persona, onClose }) {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { homeLocation } = useHomeLocation()
  const isAuthority = persona === 'authority'
  const isMarine = persona === 'marine'
  
  const initialMessage = isAuthority 
    ? t("Hello. I'm NEER. How can I assist with your regional assessment?")
    : isMarine
    ? t("Hello. I'm NEER. Ask me about route conditions, segments, or maritime hazards.")
    : t("Namaste! 👋\n\nI'm NEER. Ask me about sea conditions, fishing zones, weather or advisories.")

  const [chatMessages, setChatMessages] = useState([
    { id: 1, role: 'assistant', text: initialMessage },
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const sessionIdRef = useRef(null)

  // Voice Input States
  const [isListening, setIsListening] = useState(false)
  const [micError, setMicError] = useState(null)
  const recognitionRef = useRef(null)

  const sendMessage = async (text) => {
    if (!text || !text.trim()) return
    const userText = text.trim()
    setChatMessages((prev) => [...prev, { id: Date.now(), role: 'user', text: userText }])
    setChatInput('')
    setChatLoading(true)
    
    // If user sends message, stop listening automatically
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }

    // Marine persona keeps local canned responses
    if (isMarine) {
      setTimeout(() => {
        let response = `${t('Marine Assessment')}: ${t(mDecision.summary)} ${t(mDecision.recommendedActions[0] || '')}`
        if (userText.toLowerCase().includes('segment 3') || userText.toLowerCase().includes('swell')) {
          response = t("Segment 3 is flagged for caution due to elevated forecast wave height (1.9 m) and an active swell-surge advisory during the transit window (10:00–12:00).")
        }
        setChatMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', text: response }])
        setChatLoading(false)
      }, 800)
      return
    }

    // Fisherman & Authority personas call the real backend /api/chat
    try {
      const payload = {
        message: userText,
        persona: isAuthority ? 'authority' : 'fisherman',
        sessionId: sessionIdRef.current || undefined,
        location: homeLocation?.name || undefined,
      }

      let res
      try {
        res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } catch (proxyErr) {
        // Fallback to direct backend URL if proxy not in use
        res = await fetch('http://localhost:3001/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || `Chat API error: ${res.status}`)
      }

      const data = await res.json()

      // Retain and reuse sessionId across turns in the same modal session
      if (data.sessionId) {
        sessionIdRef.current = data.sessionId
        setSessionId(data.sessionId)
      }

      const envelope = data.response || data
      const decision = envelope?.decisionOutput
      const narrative = decision?.narrative
      const summary = decision?.summary
      const headline = decision?.headline
      const explainabilitySummary = envelope?.explainability?.summary
      const recommendedAction = Array.isArray(decision?.recommendedActions) && decision.recommendedActions.length > 0
        ? decision.recommendedActions[0]
        : ''

      let responseText = ''
      if (narrative) {
        responseText = narrative
      } else if (explainabilitySummary) {
        responseText = explainabilitySummary
      } else if (headline && summary) {
        responseText = `${headline}. ${summary}${recommendedAction ? ` ${recommendedAction}` : ''}`
      } else if (summary) {
        responseText = summary + (recommendedAction ? ` ${recommendedAction}` : '')
      } else if (headline) {
        responseText = headline
      } else if (typeof data.message === 'string') {
        responseText = data.message
      } else {
        responseText = t('Analysis complete. Conditions have been updated.')
      }

      const isFallback = data.servedFrom === 'fallback_mock' ||
        envelope?.provenance?.status === 'fallback' ||
        envelope?.provenance?.overallStatus === 'fallback'

      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: responseText,
          isFallback,
        },
      ])
    } catch (err) {
      console.error('Failed to send chat message:', err)
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: t("Sorry, I couldn't reach the assistant right now. Please make sure the backend is running and try again."),
        },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  const handleVoiceInput = () => {


    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    setMicError(null)

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setMicError(t("Voice input isn't available in this browser. You can continue typing."))
      return
    }

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN'
    recognition.interimResults = true
    recognition.continuous = true

    recognition.onstart = () => {
      console.log('[SpeechRecognition] onstart: microphone active in', recognition.lang)
      setIsListening(true)
    }

    recognition.onresult = (event) => {
      let finalTranscript = ''
      let interimTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const text = event.results[i][0]?.transcript || ''
        if (event.results[i].isFinal) {
          finalTranscript += text
        } else {
          interimTranscript += text
        }
      }

      // Show interim progress in the input while speaking
      if (interimTranscript) {
        setChatInput(interimTranscript)
      }

      // When a final sentence/transcript is recognized, automatically send message
      if (finalTranscript.trim()) {
        const textToSend = finalTranscript.trim()
        setChatInput(textToSend)
        if (recognitionRef.current) {
          recognitionRef.current.stop()
        }
        setIsListening(false)
        sendMessage(textToSend)
      }
    }

    recognition.onerror = (event) => {
      console.error('[SpeechRecognition] onerror error:', event.error, 'message:', event.message, event)
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setMicError(t("Microphone permission is required for voice input."))
      } else if (event.error === 'network') {
        setMicError(t("Voice service is unavailable in this browser (e.g. Brave/privacy shields). Please type your question below."))
      } else if (event.error === 'no-speech') {
        // user paused or didn't speak — no error banner needed
      } else {
        setMicError(t("Voice input error. Please try again or type."))
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      console.log('[SpeechRecognition] onend: recognition ended')
      setIsListening(false)
    }

    try {
      recognition.start()
    } catch (e) {
      console.error('Speech recognition start failed:', e)
      setMicError(t("Voice input failed to start."))
      setIsListening(false)
    }
  }

  // Key event listener for ESC to close
  useEffect(() => {
    const handleKeyDown = (e) => {


      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div 
        className="absolute inset-0" 
        onClick={onClose} 
        aria-hidden="true"
      />
      <div 
        className="relative w-full max-w-xl max-h-[85vh] flex flex-col bg-white rounded-2xl shadow-neer-lg overflow-hidden z-10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ask-neer-title"
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 ${isAuthority ? 'bg-slate-800' : isMarine ? 'bg-sky-900' : 'bg-neer-navy-900'} text-white`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isAuthority ? 'bg-slate-700' : isMarine ? 'bg-sky-800' : 'bg-neer-ocean-600'}`}>
              <Icon name={isAuthority ? 'messageCircle' : 'wave'} size={20} />
            </div>
            <div>
              <div id="ask-neer-title" className="font-bold">{isAuthority ? t('Ask NEER (Authority)') : isMarine ? t('Ask NEER (Marine)') : t('Ask NEER')}</div>
              <div className="text-neer-xs opacity-75">
                {isAuthority ? t('Regional intelligence assistant') : isMarine ? t('Marine intelligence assistant') : t('Fishing intelligence assistant')}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${isAuthority ? 'hover:bg-slate-700' : isMarine ? 'hover:bg-sky-800' : 'opacity-70 hover:opacity-100'}`} 
            aria-label={t('Close chat')}
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Fallback Notice Banner */}
        {chatMessages.some((m) => m.isFallback) && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-900 px-4 py-2.5 text-xs flex items-center gap-2 font-medium">
            <Icon name="alertTriangle" className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{t('Showing example data — live service temporarily unavailable, please try again shortly.')}</span>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {chatMessages.map((msg) => (
            <MessageBubble key={msg.id} role={msg.role} text={msg.text} isFallback={msg.isFallback} />
          ))}
          {chatLoading && (
            <div className="flex self-start">
              <div className={`px-4 py-3 rounded-2xl rounded-bl-sm ${isAuthority ? 'bg-slate-100' : 'bg-neer-surface-alt border border-neer-border'}`}>
                <div className="flex gap-1">
                  <span className={`w-2 h-2 rounded-full animate-bounce ${isAuthority ? 'bg-slate-400' : 'bg-neer-ink-muted'}`} style={{ animationDelay: '0ms' }} />
                  <span className={`w-2 h-2 rounded-full animate-bounce ${isAuthority ? 'bg-slate-400' : 'bg-neer-ink-muted'}`} style={{ animationDelay: '150ms' }} />
                  <span className={`w-2 h-2 rounded-full animate-bounce ${isAuthority ? 'bg-slate-400' : 'bg-neer-ink-muted'}`} style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Suggested questions */}
        <div className={`flex gap-2 p-3 px-4 flex-wrap border-t ${isAuthority ? 'border-slate-200' : 'border-neer-border'}`}>
          {isAuthority ? (
            <>
              <SuggestedQuestion text={t("Which coastal areas need attention tomorrow?")} onClick={() => sendMessage(t("Which coastal areas need attention tomorrow?"))} />
              <SuggestedQuestion text={t("Why is Ernakulam the highest-priority area?")} onClick={() => sendMessage(t("Why is Ernakulam the highest-priority area?"))} />
            </>
          ) : isMarine ? (
            <>
              <SuggestedQuestion text={t("Which part of the route needs attention?")} onClick={() => sendMessage(t("Which part of the route needs attention?"))} />
              <SuggestedQuestion text={t("Why is Segment 3 under caution?")} onClick={() => sendMessage(t("Why is Segment 3 under caution?"))} />
              <SuggestedQuestion text={t("When should we depart?")} onClick={() => sendMessage(t("When should we depart?"))} />
            </>
          ) : (
            <>
              <SuggestedQuestion text={`🐟 ${t('Where are the fishing zones?')}`} onClick={() => sendMessage(t('Where are the fishing zones?'))} />
              <SuggestedQuestion text={`🌊 ${t('How are the sea conditions?')}`} onClick={() => sendMessage(t('How are the sea conditions?'))} />
              <SuggestedQuestion text={`⚠️ ${t('Are there any hazards?')}`} onClick={() => sendMessage(t('Are there any hazards?'))} />
            </>
          )}
        </div>

        {/* Composer */}
        <div className={`flex flex-col p-3 px-4 border-t ${isAuthority ? 'bg-slate-50 border-slate-200' : 'bg-neer-surface-alt border-neer-border'}`}>
          
          {/* Mic Error Message */}
          {micError && (
            <div className="text-neer-xs text-red-600 mb-2 flex items-center gap-1.5 bg-red-50 p-2 rounded border border-red-100">
              <Icon name="alertTriangle" size={14} />
              {micError}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Input
              id="chat-input"
              placeholder={isListening ? t("Listening...") : isAuthority ? t("Ask about regional conditions...") : isMarine ? t("Ask about marine conditions...") : t("Ask about sea conditions…")}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage(chatInput)}
              className="flex-1 min-w-0"
            />
            <div className="relative flex items-center justify-center">
              {isListening && (
                <span className="absolute inset-0 rounded-lg bg-red-500 animate-ping opacity-75"></span>
              )}
              <button
                type="button"
                onClick={handleVoiceInput}
                className={`relative z-10 w-10 h-10 flex items-center justify-center rounded-lg transition-all border ${isListening ? 'bg-red-500 border-red-600 text-white shadow-md' : 'bg-neer-ocean-50 border-transparent text-neer-ocean-600 hover:bg-neer-ocean-100 hover:border-neer-ocean-200'}`}
                aria-label={isListening ? t("Stop voice input") : t("Start voice input")}
                title={isListening ? t("Stop voice input") : t("Start voice input")}
              >
                <Icon name={isListening ? 'micOff' : 'mic'} size={20} />
              </button>
            </div>
            
            <IconButton name="send" label={t("Send")} variant="primary" onClick={() => sendMessage(chatInput)} />
          </div>
        </div>
      </div>
    </div>
  )
}
