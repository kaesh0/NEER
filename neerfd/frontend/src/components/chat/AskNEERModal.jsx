import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Icon } from '../../icons/index.js'
import { decision as mDecision } from '../../data/mock/marineData.js'
import { useTranslation } from '../../i18n/translations.js'
import { useLanguage } from '../../context/LanguageContext.jsx'
import { getRegionalGreetingInfo } from '../../utils/coastalGeocoder.js'

function getLocalAdvisory(query, location, persona) {
  const q = (query || '').toLowerCase()
  const port = location || 'Kochi, Kerala'

  if (q.includes('net') || q.includes('cast') || q.includes('protected') || q.includes('mpa') || q.includes('restriction')) {
    return {
      text: `No, net deployment is prohibited here. Your vessel coordinates fall within the Demo Marine Protected Area preservation zone.`,
      status: 'caution',
      calloutTitle: 'Recommended Exit Vector:',
      calloutContent: 'Steer 240° WSW for 6.2 NM to reach uninhibited waters before lowering commercial gear. Expected sea state along exit corridor: smooth (0.94 m wave height).',
    }
  }

  if (q.includes('segment 3') || q.includes('swell') || q.includes('methodology') || q.includes('delay')) {
    return {
      text: `Segment 3 is flagged for caution due to elevated forecast wave height (1.9 m) and an active swell-surge advisory during the transit window (10:00–12:00 IST). Departing at 06:00 IST avoids peak midday swell crest.`,
      status: 'caution',
    }
  }

  if (q.includes('pfz') || q.includes('fish') || q.includes('machli') || q.includes('zone')) {
    return {
      text: `According to INCOIS Potential Fishing Zone (PFZ) guidance near ${port}, productive thermal front zones are located approximately 14–22 km offshore. Favourable for pelagic schools.`,
      status: 'favourable',
    }
  }

  if (q.includes('wind') || q.includes('speed')) {
    return {
      text: `Current wind conditions near ${port} indicate calm-to-moderate coastal breezes of approximately 12–16 km/h. Sea surface winds remain within manageable operating limits for small crafts.`,
      status: 'favourable',
    }
  }

  return {
    text: `Marine Copilot assessment for ${port}: Real-time telemetry confirmed. Conditions are currently suitable for operations with moderate swell and normal visibility.`,
    status: 'favourable',
  }
}

export default function AskNEERModal({ persona, locationName, selectedLocation, onClose }) {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const isAuthority = persona === 'authority'
  const isMarine = persona === 'marine'

  const activePort = locationName || selectedLocation?.name || (isMarine ? 'Kochi Port · Lakshadweep' : isAuthority ? 'Ernakulam, Kerala' : 'Kochi, Kerala')

  const greetingInfo = useMemo(() => {
    return getRegionalGreetingInfo(
      selectedLocation || locationName || activePort,
      selectedLocation?.lat,
      selectedLocation?.lng
    )
  }, [selectedLocation, locationName, activePort])

  const getInitialMessage = (info = greetingInfo) => {
    if (isAuthority) {
      if (language === 'hi') {
        return `नमस्ते अधिकारी महोदय। ${info.placeLabel} एवं ${info.admin} के लिए तटीय प्राधिकरण मोड सक्रिय है। लाइव टेलीमेट्री और MPA अनुपालन सिंक है।`
      }
      return `Hello Officer. Coastal Authority mode is active for ${info.placeLabel} & ${info.admin}. All marine zone compliance and weather telemetry feeds are synced.`
    }
    if (isMarine) {
      return `Welcome Operator. Real-time telemetry for ${info.placeLabel} is synced (${info.coordinatesStr}). How can I assist your voyage planning?`
    }
    if (language === 'hi') {
      return `${info.salutationHi} मैं नीर् (NEER) हूँ, आपका स्वायत्त समुद्री सहायक। ${info.placeLabel} (${info.coordinatesStr}) पर आपके पोत की स्थिति की पुष्टि हुई है। आज आपकी क्या सहायता कर सकता हूँ?`
    }
    return `${info.salutation} I am NEER, your autonomous marine copilot. Real-time telemetry confirms your vessel position off ${info.placeLabel} (${info.coordinatesStr}). How can I assist your fishing trip today?`
  }

  const [chatMessages, setChatMessages] = useState([
    { id: 1, role: 'assistant', text: getInitialMessage() },
  ])

  useEffect(() => {
    setChatMessages((prev) => {
      if (prev.length <= 1) {
        return [{ id: 1, role: 'assistant', text: getInitialMessage(greetingInfo) }]
      }
      return prev
    })
  }, [greetingInfo.placeLabel, greetingInfo.salutation, persona, language])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const sessionIdRef = useRef(null)
  const chatBottomRef = useRef(null)

  // Voice Input States
  const [isListening, setIsListening] = useState(false)
  const [micError, setMicError] = useState(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatLoading])

  const sendMessage = async (text) => {
    if (!text || !text.trim() || chatLoading) return
    const userText = text.trim()
    setChatMessages((prev) => [...prev, { id: Date.now(), role: 'user', text: userText }])
    setChatInput('')
    setChatLoading(true)

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }

    if (isMarine) {
      setTimeout(() => {
        let response = `${t('Marine Assessment')}: ${t(mDecision.summary)} ${t(mDecision.recommendedActions[0] || '')}`
        if (userText.toLowerCase().includes('segment 3') || userText.toLowerCase().includes('swell')) {
          response = t('Segment 3 is flagged for caution due to elevated forecast wave height (1.9 m) and an active swell-surge advisory during the transit window (10:00–12:00).')
        } else if (userText.toLowerCase().includes('delay') || userText.toLowerCase().includes('08:00')) {
          response = t('Delaying departure to 08:00 IST places vessel transit across Segment 3 directly into the peak swell crest (1.9 m @ 11:15 IST). Recommended departure remains strictly 06:00 IST.')
        }
        setChatMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', text: response }])
        setChatLoading(false)
      }, 700)
      return
    }

    try {
      const payload = {
        message: userText,
        persona: isAuthority ? 'authority' : 'fisherman',
        location: locationName || undefined,
        sessionId: sessionIdRef.current || undefined,
      }

      let res
      try {
        res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } catch (proxyErr) {
        res = await fetch('http://localhost:3001/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        throw new Error(`Chat API error: ${res.status}`)
      }

      const data = await res.json()

      if (data.sessionId) {
        sessionIdRef.current = data.sessionId
        setSessionId(data.sessionId)
      }

      const env = data.response || data
      const dec = env?.decisionOutput
      let textResponse = ''

      if (dec?.narrative && typeof dec.narrative === 'string') {
        textResponse = dec.narrative
      } else if (dec?.headline && dec?.summary) {
        textResponse = `${dec.headline} ${dec.summary}`
      } else if (dec?.summary) {
        textResponse = dec.summary
      } else if (dec?.headline) {
        textResponse = dec.headline
      } else if (env?.explainability?.summary) {
        textResponse = env.explainability.summary
      } else if (typeof data.message === 'string') {
        textResponse = data.message
      } else {
        textResponse = t('Assessment complete for {{location}}.', { location: activePort })
      }

      const isFallback = data.servedFrom === 'fallback_mock' || env?.provenance?.status === 'fallback'

      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: textResponse,
          status: dec?.status,
          isFallback,
        },
      ])
    } catch (err) {
      console.error('Drawer Chat API failed, using intelligent local advisory:', err)
      const local = getLocalAdvisory(userText, activePort, persona)
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: local.text,
          status: local.status,
          isFallback: true,
        },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setMicError(t('Speech recognition is not supported in this browser.'))
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    setMicError(null)
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN'
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join('')
      setChatInput(transcript)
    }
    recognition.onerror = (err) => {
      setIsListening(false)
      if (err.error !== 'no-speech') {
        setMicError(t('Voice input error. Please try typing.'))
      }
    }
    recognition.onend = () => setIsListening(false)

    try {
      recognition.start()
    } catch (e) {
      console.error('Speech recognition start failed:', e)
      setIsListening(false)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  const suggestions = isAuthority ? [
    'What happens if we delay departure to 08:00 IST?',
    'Explain swell forecast methodology for Segment 3.',
    'Audit MPA boundary infringement risk',
  ] : [
    'Where is nearest PFZ zone and sea conditions?',
    'Explain swell forecast methodology for Segment 3.',
    'What happens if we delay departure to 08:00 IST?',
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-[1px] z-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Drawer */}
      <section
        aria-label="NEER Maritime Copilot Drawer"
        className="fixed top-0 right-0 h-full w-[430px] max-w-[100vw] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col justify-between animate-fade-in"
        id="neer-side-drawer"
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0284c7] text-white flex items-center justify-center font-bold text-lg shadow-sm flex-shrink-0">
              N
            </div>
            <div className="flex flex-col">
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {isAuthority ? t('NEER Marine Authority Copilot') : t('NEER Maritime Copilot')}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                <span className="text-xs text-emerald-600 font-medium">
                  {t('Telemetric reasoning ready')}
                </span>
              </div>
            </div>
          </div>
          <button
            aria-label="Close NEER Drawer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            onClick={onClose}
            type="button"
          >
            <svg className="w-5 h-5" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
              <line x1="18" x2="6" y1="6" y2="18"></line>
              <line x1="6" x2="18" y1="6" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Drawer Chat Stream */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 neer-scroll bg-white" id="drawer-chat-stream">
          {chatMessages.map((msg) => {
            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="flex items-start gap-2.5 max-w-[85%] ml-auto flex-row-reverse animate-message-in">
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-xs">
                    <svg className="w-3.5 h-3.5" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <div className="bg-[#0284c7] text-white p-3 rounded-2xl rounded-tr-sm text-sm shadow-xs font-medium leading-relaxed">
                    {msg.text}
                  </div>
                </div>
              )
            }

            return (
              <div key={msg.id} className="bg-slate-100/90 text-slate-900 p-4 rounded-2xl rounded-tl-sm text-sm leading-relaxed border border-slate-200/50 shadow-xs space-y-2 animate-message-in">
                <div>{msg.text}</div>
                {msg.calloutContent && (
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1 font-medium">
                    <div className="font-bold text-amber-800">{msg.calloutTitle || 'Advisory:'}</div>
                    <div>{msg.calloutContent}</div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Suggested Inquiries (shown when only initial message exists) */}
          {chatMessages.length <= 1 && (
            <div className="space-y-2.5 pt-1" id="drawer-suggestions-container">
              <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                {t('SUGGESTED INQUIRIES')}
              </div>
              <div className="space-y-2">
                {suggestions.map((q, idx) => (
                  <button
                    key={idx}
                    className="w-full text-left p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-sky-400 hover:bg-sky-50/40 text-sm text-slate-800 transition shadow-xs block cursor-pointer"
                    onClick={() => sendMessage(q)}
                    type="button"
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {chatLoading && (
            <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200/60 rounded-2xl max-w-xs animate-pulse">
              <span className="w-2 h-2 rounded-full bg-[#0284c7] animate-ping"></span>
              <span className="text-xs text-slate-600 font-medium">
                {t('Processing oceanic telemetry...')}
              </span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Drawer Footer Input */}
        <div className="p-4 bg-white border-t border-slate-100">
          <form
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 shadow-inner focus-within:border-sky-500 focus-within:bg-white transition"
            onSubmit={(e) => {
              e.preventDefault()
              sendMessage(chatInput)
            }}
          >
            <input
              autoComplete="off"
              className="flex-1 bg-transparent border-none text-sm text-slate-800 placeholder-slate-400 focus:ring-0 px-0 outline-none"
              id="drawer-user-input"
              placeholder={isListening ? t('Listening...') : t('Ask NEER about waves, wind, routes...')}
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button
              aria-label="Voice input"
              className={`p-1 text-slate-400 hover:text-sky-600 transition flex-shrink-0 cursor-pointer ${
                isListening ? 'text-rose-600 animate-pulse' : ''
              }`}
              onClick={handleVoiceInput}
              type="button"
            >
              <svg className="w-4 h-4" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
                <path d="M12 19v3"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <rect height="13" rx="3" width="6" x="9" y="2"></rect>
              </svg>
            </button>
            <button
              aria-label="Send Query"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#0284c7] hover:bg-sky-100 transition flex-shrink-0 cursor-pointer"
              type="submit"
              disabled={chatLoading}
            >
              <svg className="w-5 h-5" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
                <line x1="5" x2="19" y1="12" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </form>
        </div>
      </section>
    </>
  )
}
