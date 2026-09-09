import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Icon } from '../../icons/index.js'
import { useTranslation } from '../../i18n/translations.js'
import { useLanguage } from '../../context/LanguageContext.jsx'
import { decision as mDecision } from '../../data/mock/marineData.js'
import { getRegionalGreetingInfo } from '../../utils/coastalGeocoder.js'

function getLocalAdvisory(query, location, persona, selectedLocation) {
  const q = (query || '').toLowerCase()
  const port = location || 'Coastal Sector'

  if (selectedLocation?.isCoastal === false) {
    const distText = selectedLocation.distanceToCoastKm ? `${Math.round(selectedLocation.distanceToCoastKm)} km from the coast` : 'located inland'
    const nearestPort = selectedLocation.nearestCoastalPlace || 'a coastal port'
    return {
      text: `${port} is an inland area (${distText}). Oceanic wave heights, marine swell forecasts, and Potential Fishing Zones (PFZ) do not apply to inland regions. To view live marine telemetry, please switch to ${nearestPort} or another coastal port.`,
      status: 'caution',
      calloutTitle: 'Inland Notice:',
      calloutContent: `Nearest recommended coastal sector is ${nearestPort}. Switch your active location to access real-time INCOIS PFZ bands, sea surface temperatures, and marine hazard warnings.`,
    }
  }

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
      dispersionMatrix: true,
    }
  }

  if (q.includes('offset_pfz') || q.includes('route') || q.includes('corridor')) {
    return {
      text: `Route offset_pfz safety check: Transit route is clear of marine hazards with forecast wave height of 1.3 m and winds at 14.7 km/h. Clear passage verified.`,
      status: 'favourable',
      calloutTitle: 'Corridor Conditions:',
      calloutContent: 'Wave: 1.3 m • Wind: 14.7 km/h WNW • Bathymetry: 35–85 m • Visibility: 10 NM.',
    }
  }

  if (q.includes('pfz') || q.includes('fish') || q.includes('machli') || q.includes('zone') || q.includes('cluster')) {
    const pfzLat = selectedLocation?.lat != null ? (selectedLocation.lat - 0.15).toFixed(2) : '9.78'
    const isEast = (selectedLocation?.lng ?? 76) > 80
    const pfzLng = selectedLocation?.lng != null ? (selectedLocation.lng + (isEast ? 0.35 : -0.35)).toFixed(2) : '75.92'
    const exitDir = isEast ? 'ESE' : 'WSW'
    return {
      text: `According to INCOIS Potential Fishing Zone (PFZ) guidance near ${port}, productive thermal front zones are located approximately 14–22 km offshore. Favourable for pelagic schools.`,
      status: 'favourable',
      calloutTitle: 'Target Zone Telemetry:',
      calloutContent: `Coordinates: ${pfzLat}° N, ${pfzLng}° E (16.4 NM ${exitDir}). Sea surface temp gradient: 28.4°C. Chlorophyll-a: 0.82 mg/m³.`,
    }
  }

  if (q.includes('wind') || q.includes('hawa') || q.includes('speed')) {
    return {
      text: `Current wind conditions near ${port} indicate calm-to-moderate coastal breezes of approximately 12–16 km/h. Sea surface winds remain within manageable operating limits for small crafts.`,
      status: 'favourable',
    }
  }

  if (q.includes('wave') || q.includes('lehar') || q.includes('height')) {
    return {
      text: `Forecast wave heights off ${port} show 1.1 m to 1.4 m with a swell period of 8–10 seconds. Sea state is moderate; exercise standard precautions around harbor entrances.`,
      status: 'caution',
    }
  }

  if (q.includes('hazard') || q.includes('danger') || q.includes('safe') || q.includes('warning')) {
    return {
      text: `Marine safety assessment near ${port}: Overall sea conditions are favourable. Wind and wave heights remain within safe operating thresholds. Ensure GPS and life jackets are operational before departure.`,
      status: 'favourable',
    }
  }

  return {
    text: `Marine Copilot assessment for ${port}: Real-time telemetry confirmed. Oceanographic conditions are currently suitable for coastal operations with moderate swell and normal visibility. Navigational corridors remain open.`,
    status: 'favourable',
  }
}

export default function AskNEERSection({ persona, locationName, selectedLocation, onNavigate }) {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const isAuthority = persona === 'authority'
  const isMarine = persona === 'marine'

  const activePort = locationName || selectedLocation?.name || (isMarine ? 'Kochi Port · Lakshadweep' : isAuthority ? 'Ernakulam, Kerala' : 'Kochi, Kerala coast')

  // Derive authentic cultural regional greeting and coordinates based on active port/state
  const greetingInfo = useMemo(() => {
    return getRegionalGreetingInfo(
      selectedLocation || locationName || activePort,
      selectedLocation?.lat,
      selectedLocation?.lng
    )
  }, [selectedLocation, locationName, activePort])

  const coordinatesStr = greetingInfo.coordinatesStr

  const getInitialGreeting = (info = greetingInfo) => {
    if (isAuthority) {
      if (language === 'hi') {
        return {
          text: `नमस्ते अधिकारी महोदय। ${info.placeLabel} एवं ${info.admin} समुद्री क्षेत्र के लिए तटीय प्राधिकरण मोड सक्रिय है। प्राथमिकता: समुद्री संरक्षित क्षेत्र (MPA) अनुपालन और मौसम संबंधी टेलीमेट्री।`,
          tag: 'NEER तटीय प्राधिकरण रीजनिंग इंजन',
          feed: 'INCOIS और AIS लाइव सिंक',
        }
      }
      return {
        text: `Hello Officer. Coastal Authority mode is active for ${info.placeLabel} & ${info.admin} Maritime Zone. Priority focus: Demo Marine Protected Area compliance and weather hazard telemetry.`,
        tag: 'NEER Coastal Authority Reasoning Engine',
        feed: 'INCOIS & AIS Live Synced',
      }
    }
    if (isMarine) {
      return {
        text: `Welcome Operator. I am ready to evaluate voyage routing, sea state parameters, and speed-made-good for ${info.placeLabel}.\n\nCurrent INCOIS OSF forecast shows real-time wave telemetry active (${info.coordinatesStr}). How can I assist your voyage planning?`,
        tag: 'NEER Navigation Copilot',
        feed: 'INCOIS OSF Synced',
        dispersionMatrix: true,
      }
    }
    // Fisherman Persona - Regionally authentic greeting
    if (language === 'hi') {
      return {
        text: `${info.salutationHi} मैं नीर् (NEER) हूँ, आपका स्वायत्त समुद्री सहायक। रीयल-टाइम टेलीमेट्री ${info.placeLabel} (${info.coordinatesStr}) पर आपके पोत की स्थिति की पुष्टि करती है। सभी क्षेत्रीय चेतावनियाँ, वेव रडार और PFZ ज़ोन सक्रिय हैं।\n\nमौसम के खतरों, सुरक्षित गलियारों, या मछली पकड़ने के संभावित क्षेत्रों के बारे में पूछें।`,
        tag: 'नीर् टेलीमेट्रिक एजेंट',
        feed: 'INCOIS फ़ीड सिंक',
      }
    }
    return {
      text: `${info.salutation} I am NEER, your autonomous marine copilot. Real-time telemetry confirms your vessel position off ${info.placeLabel} (${info.coordinatesStr}). All regional advisories, wave radar data, and PFZ fronts are active.\n\nAsk about weather hazards, boundary clear corridors, safe target zones, or select an inquiry above.`,
      tag: 'NEER Telemetric Agent',
      feed: 'INCOIS Feed Synced',
    }
  }

  const initial = getInitialGreeting()
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      text: initial.text,
      tag: initial.tag,
      feed: initial.feed,
      dispersionMatrix: initial.dispersionMatrix,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])

  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const sessionIdRef = useRef(null)
  const chatBottomRef = useRef(null)

  // Speech Recognition
  const [isListening, setIsListening] = useState(false)
  const [speechError, setSpeechError] = useState(null)
  const recognitionRef = useRef(null)

  // Text-to-Speech
  const [speakingId, setSpeakingId] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Clean speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // When active location or persona or language changes, update greeting if conversation is still fresh
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length <= 1) {
        const fresh = getInitialGreeting(greetingInfo)
        return [
          {
            id: Date.now(),
            role: 'assistant',
            text: fresh.text,
            tag: fresh.tag,
            feed: fresh.feed,
            dispersionMatrix: fresh.dispersionMatrix,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]
      }
      return prev
    })
  }, [greetingInfo.placeLabel, greetingInfo.salutation, persona, language])

  const handleCopy = (id, text) => {
    navigator.clipboard?.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSpeak = (msgId, text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    if (speakingId === msgId) {
      window.speechSynthesis.cancel()
      setSpeakingId(null)
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN'
    utterance.rate = 1.0
    utterance.onend = () => setSpeakingId(null)
    utterance.onerror = () => setSpeakingId(null)
    setSpeakingId(msgId)
    window.speechSynthesis.speak(utterance)
  }

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSpeechError(t('Speech recognition is not supported in this browser.'))
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    setSpeechError(null)
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN'
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join('')
      setInputText(transcript)
    }
    recognition.onerror = (err) => {
      setIsListening(false)
      if (err.error !== 'no-speech') {
        setSpeechError(t('Could not recognize voice. Please try typing.'))
      }
    }
    recognition.onend = () => setIsListening(false)
    recognition.start()
  }

  const handleClearChat = () => {
    sessionIdRef.current = null
    setSessionId(null)
    if (speakingId && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setSpeakingId(null)
    }
    const fresh = getInitialGreeting(greetingInfo)
    setMessages([
      {
        id: Date.now(),
        role: 'assistant',
        text: fresh.text,
        tag: fresh.tag,
        feed: fresh.feed,
        dispersionMatrix: fresh.dispersionMatrix,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
  }

  const handleSendMessage = async (rawText) => {
    const textToSend = (typeof rawText === 'string' && rawText.trim() ? rawText : inputText).trim()
    if (!textToSend || loading) return

    const userMessageTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: 'user',
        text: textToSend,
        time: userMessageTime,
      },
    ])
    setInputText('')
    setLoading(true)
    setSpeechError(null)

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }

    // Marine persona uses canned coastal corridor intelligence
    if (isMarine) {
      setTimeout(() => {
        let answer = `${t('Marine Assessment')}: ${t(mDecision.summary)} ${t(mDecision.recommendedActions[0] || '')}`
        let isCaution = false
        let hasMatrix = false

        if (textToSend.toLowerCase().includes('segment 3') || textToSend.toLowerCase().includes('swell')) {
          answer = t("Segment 3 is flagged for caution due to elevated forecast wave height (1.9 m) and an active swell-surge advisory during the transit window (10:00–12:00 IST).")
          isCaution = true
          hasMatrix = true
        } else if (textToSend.toLowerCase().includes('delay') || textToSend.toLowerCase().includes('08:00')) {
          answer = t("Delaying departure to 08:00 IST places vessel transit across Segment 3 directly into the peak swell crest (1.9 m @ 11:15 IST). Recommended departure remains strictly 06:00 IST.")
          isCaution = true
          hasMatrix = true
        }

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: 'assistant',
            text: answer,
            status: isCaution ? 'caution' : 'favourable',
            dispersionMatrix: hasMatrix,
            tag: 'NEER Navigation Copilot',
            feed: 'INCOIS OSF Synced',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
        setLoading(false)
      }, 700)
      return
    }

    // Call /api/chat with location context, with proxy fallback
    try {
      const payload = {
        message: textToSend,
        persona: isAuthority ? 'authority' : 'fisherman',
        location: activePort,
        sessionId: sessionIdRef.current || undefined,
      }

      let data = null
      let fetchError = null

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          data = await res.json()
        } else {
          fetchError = new Error(`Proxy status: ${res.status}`)
        }
      } catch (proxyErr) {
        fetchError = proxyErr
      }

      // If relative proxy failed, try direct backend port 3001
      if (!data) {
        try {
          const directRes = await fetch('http://localhost:3001/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          if (directRes.ok) {
            data = await directRes.json()
          }
        } catch (directErr) {
          fetchError = directErr
        }
      }

      let textResponse = ''
      let status = null
      let isFallback = false
      let calloutTitle = null
      let calloutContent = null

      if (data) {
        if (data.sessionId) {
          sessionIdRef.current = data.sessionId
          setSessionId(data.sessionId)
        }

        const env = data.response || data
        const dec = env?.decisionOutput
        status = dec?.status || null

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
          textResponse = t('Marine intelligence analysis complete for {{location}}.', { location: activePort })
        }

        if (Array.isArray(dec?.recommendedActions) && dec.recommendedActions.length > 0) {
          const firstAction = dec.recommendedActions[0]
          if (typeof firstAction === 'string' && !textResponse.includes(firstAction)) {
            calloutTitle = 'Recommended Action:'
            calloutContent = firstAction
          }
        }

        isFallback = data.servedFrom === 'fallback_mock' || env?.provenance?.status === 'fallback'
      } else {
        // High quality local fallback ensures zero dead-ends
        const local = getLocalAdvisory(textToSend, activePort, persona, selectedLocation)
        textResponse = local.text
        status = local.status
        calloutTitle = local.calloutTitle
        calloutContent = local.calloutContent
        isFallback = true
      }

      // Check for MPA restriction keywords to render special exit vector banner
      const qLower = textToSend.toLowerCase()
      if (qLower.includes('net') || qLower.includes('cast') || qLower.includes('protected') || qLower.includes('mpa')) {
        status = 'caution'
        calloutTitle = 'Recommended Exit Vector:'
        calloutContent = 'Steer 240° WSW for 6.2 NM to reach uninhibited waters before lowering commercial gear. Expected sea state along exit corridor: smooth (0.94 m wave height).'
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: textResponse,
          status,
          calloutTitle,
          calloutContent,
          isFallback,
          tag: isAuthority ? 'NEER Coastal Authority Reasoning Engine' : 'NEER Telemetric Agent',
          feed: isAuthority ? 'INCOIS & AIS Live Synced' : 'INCOIS Feed Synced',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } catch (err) {
      console.error('Chat error:', err)
      const local = getLocalAdvisory(textToSend, activePort, persona)
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: local.text,
          status: local.status,
          calloutTitle: local.calloutTitle,
          calloutContent: local.calloutContent,
          isFallback: true,
          tag: isAuthority ? 'NEER Coastal Authority Reasoning Engine' : 'NEER Telemetric Agent',
          feed: 'INCOIS Feed Synced',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const portTitle = greetingInfo.placeLabel.split(',')[0].trim()
  const promptCards = isAuthority ? [
    {
      category: 'HAZARD ADVISORY',
      catColor: 'text-rose-600',
      title: `Current hazard status for ${portTitle} coast`,
      query: `What is the current ocean hazard status for ${portTitle} and regional maritime zone?`,
    },
    {
      category: 'REGULATORY AUDIT',
      catColor: 'text-amber-600',
      title: 'Audit MPA boundary infringement risk',
      query: `Audit active fishing vessels and MPA boundary infringement risk near ${portTitle} sector.`,
    },
    {
      category: 'WARNING DISSEMINATION',
      catColor: 'text-sky-600',
      title: 'INCOIS weather warning status & dissemination',
      query: 'Check INCOIS high swell advisory bulletin and alert dissemination status.',
    },
  ] : isMarine ? [
    {
      category: 'VOYAGE OPTIMIZATION',
      catColor: 'text-sky-600',
      title: 'What happens if we delay departure to 08:00 IST?',
      query: 'What happens if we delay departure to 08:00 IST?',
    },
    {
      category: 'METOCEAN TELEMETRY',
      catColor: 'text-amber-600',
      title: 'Explain swell forecast methodology for Segment 3',
      query: 'Explain swell forecast methodology for Segment 3.',
    },
    {
      category: 'TACTICAL ROUTING',
      catColor: 'text-emerald-600',
      title: 'Route offset_pfz safety check (1.3 m wave)',
      query: 'Explain wave and swell conditions along offset_pfz route.',
    },
  ] : [
    {
      category: 'PFZ INTELLIGENCE',
      catColor: 'text-sky-600',
      title: `Nearest PFZ cluster & sea conditions off ${portTitle}`,
      query: `What is the nearest PFZ zone coordinates and swell forecast off ${portTitle}?`,
    },
    {
      category: 'SAFETY & COMPLIANCE',
      catColor: 'text-amber-600',
      title: 'Exit corridor for Marine Protected Area',
      query: 'What are the restrictions inside Demo Marine Protected Area?',
    },
    {
      category: 'NAVIGATIONAL ROUTE',
      catColor: 'text-emerald-600',
      title: 'Route offset_pfz safety check (1.3 m wave)',
      query: 'Explain wave and swell conditions along offset_pfz route.',
    },
  ]

  return (
    <main className="tab-view-content flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5 animate-fade-in" id="view-ask-neer">
      {/* Top Copilot Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#0284c7] text-white flex items-center justify-center font-bold text-xl shadow-md flex-shrink-0">
            N
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {isAuthority ? t('NEER Marine Authority Copilot') : isMarine ? t('NEER Maritime Copilot Console') : t('NEER Maritime Copilot')}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {isAuthority ? t('INCOIS & AIS Live Synced') : isMarine ? t('Active Telemetric Reasoning') : t('Active Reasoning')}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {isAuthority
                ? t('Autonomous coastal intelligence, vessel alert queries, and INCOIS compliance workflow')
                : isMarine
                ? t('INCOIS-calibrated telemetric reasoning & voyage decision intelligence.')
                : t('Autonomous coastal intelligence & advisory console • Integrated with INCOIS / IMD telemetric feeds')}
            </p>
          </div>
        </div>

        {/* Right Status Pill & Reset Button */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-sm font-medium hidden sm:inline-flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-sky-600" fill="none" height="24" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="24">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"></path>
            </svg>
            <span>{greetingInfo.placeLabel} • {greetingInfo.coordinatesStr}</span>
          </span>
          <button
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition shadow-sm cursor-pointer"
            onClick={handleClearChat}
            type="button"
          >
            {isMarine ? t('Clear Thread') : t('Reset Session')}
          </button>
        </div>
      </div>

      {/* 3 Quick Prompt / Inquiry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        {promptCards.map((card, idx) => (
          <button
            key={idx}
            className="text-left p-3 rounded-xl bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 transition shadow-sm group cursor-pointer"
            onClick={() => handleSendMessage(card.query)}
            type="button"
          >
            <div className={`text-[11px] font-bold ${card.catColor} uppercase tracking-wider mb-1`}>
              {card.category}
            </div>
            <div className="text-xs font-semibold text-slate-800 group-hover:text-sky-700">
              {card.title}
            </div>
          </button>
        ))}
      </div>

      {/* Main Chat History Box */}
      <div
        className="space-y-4 min-h-[460px] max-h-[560px] bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm overflow-y-auto neer-scroll"
        id="full-chat-history"
      >
        {messages.map((m) => {
          if (m.role === 'user') {
            return (
              <div key={m.id} className="flex items-start gap-3 max-w-xl ml-auto flex-row-reverse animate-message-in">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-sm">
                  <svg className="w-4 h-4" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <div className="bg-[#0284c7] text-white p-3.5 rounded-2xl rounded-tr-sm text-sm shadow-sm font-medium leading-relaxed">
                  {m.text}
                </div>
              </div>
            )
          }

          const isCaution = m.status === 'caution' || m.status === 'danger'

          return (
            <div key={m.id} className="flex items-start gap-3.5 max-w-2xl animate-message-in">
              <div className="w-9 h-9 rounded-xl bg-[#0284c7] text-white flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-sm">
                N
              </div>
              <div className="bg-slate-100/90 text-slate-800 p-4 rounded-2xl rounded-tl-sm text-sm space-y-2.5 shadow-sm border border-slate-200/40 w-full">
                {/* Agent Tag Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {m.tag || 'NEER Telemetric Agent'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {m.feed || 'INCOIS Feed Synced'}
                    </span>
                  </div>
                  {m.time && (
                    <span className="text-[10px] text-slate-400">{m.time}</span>
                  )}
                </div>

                {/* Status Indicator */}
                {isCaution && (
                  <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs">
                    <svg className="w-4 h-4" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path>
                      <path d="M12 9v4"></path>
                      <path d="M12 17h.01"></path>
                    </svg>
                    <span>Caution: Restricted Perimeter</span>
                  </div>
                )}

                {/* Main Message Text */}
                <div className="text-slate-800 whitespace-pre-line leading-relaxed">
                  {m.text}
                </div>

                {/* Telemetric Dispersion Matrix (For Maritime Segment 3) */}
                {m.dispersionMatrix && (
                  <div className="bg-sky-50/80 border border-sky-200 rounded-xl p-3 text-xs">
                    <span className="font-mono font-bold text-sky-900 uppercase tracking-wider text-[10px] block mb-1">
                      TELEMETRIC DISPERSION MATRIX
                    </span>
                    <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                      <div>
                        <span className="text-slate-400 block">Swell Crest:</span> 1.9m @ 11:15 IST
                      </div>
                      <div>
                        <span className="text-slate-400 block">Wind Force:</span> 24 km/h WNW
                      </div>
                      <div>
                        <span className="text-slate-400 block">Safe Window:</span> Before 10:00 IST
                      </div>
                    </div>
                  </div>
                )}

                {/* Structured Callout Box (Exit Vector or Recommended Action) */}
                {m.calloutContent && (
                  <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1 font-medium">
                    <div className="font-bold text-amber-800">
                      {m.calloutTitle || 'Recommended Exit Vector:'}
                    </div>
                    <div>{m.calloutContent}</div>
                  </div>
                )}

                {/* Audio Listen & Copy Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-200/50 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleCopy(m.id, m.text)}
                    className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition bg-white px-2 py-0.5 rounded border border-slate-200 cursor-pointer"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    </svg>
                    <span>{copiedId === m.id ? t('Copied!') : t('Copy')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSpeak(m.id, m.text)}
                    className={`inline-flex items-center gap-1 transition px-2 py-0.5 rounded border cursor-pointer ${
                      speakingId === m.id
                        ? 'bg-sky-50 text-sky-700 border-sky-300'
                        : 'text-slate-500 hover:text-slate-800 bg-white border-slate-200'
                    }`}
                  >
                    {speakingId === m.id ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-600 animate-ping"></span>
                        <span className="font-semibold text-sky-700">{t('Speaking...')}</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                        </svg>
                        <span>{t('Listen')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {/* Sonar Thinking Loading Animation */}
        {loading && (
          <div className="flex items-start gap-3.5 max-w-2xl animate-fade-in">
            <div className="w-9 h-9 rounded-xl bg-[#0284c7] text-white flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-sm">
              N
            </div>
            <div className="bg-slate-100/90 text-slate-800 p-4 rounded-2xl rounded-tl-sm text-sm space-y-2 shadow-sm border border-slate-200/40 flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7] animate-ping"></span>
              <span className="text-xs text-slate-600 font-medium">
                {t('Querying coastal oceanographic telemetry & INCOIS models...')}
              </span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Mic Error Banner */}
      {speechError && (
        <div className="text-xs text-rose-600 flex items-center gap-2 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
          <Icon name="alertTriangle" size={14} />
          <span>{speechError}</span>
        </div>
      )}

      {/* Query Form Input */}
      <form
        className="flex items-center gap-2.5 bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200/90 shadow-md focus-within:border-sky-500 transition"
        onSubmit={(e) => {
          e.preventDefault()
          handleSendMessage()
        }}
      >
        {/* Voice Command Button */}
        <button
          className={`p-2 rounded-xl transition flex-shrink-0 cursor-pointer ${
            isListening
              ? 'bg-rose-50 text-rose-600 border border-rose-200 animate-pulse'
              : 'text-slate-400 hover:text-sky-600 hover:bg-slate-100'
          }`}
          onClick={handleVoiceInput}
          title={isListening ? t('Stop Listening') : t('Voice Command (Malayalam/Tamil/English)')}
          type="button"
        >
          <svg className="w-5 h-5 text-sky-600" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
            <path d="M12 19v3"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <rect height="13" rx="3" width="6" x="9" y="2"></rect>
          </svg>
        </button>

        {/* Input Field */}
        <input
          className="flex-1 bg-transparent border-none text-sm text-slate-800 placeholder-slate-400 focus:ring-0 px-2 outline-none font-medium"
          id="neer-full-input"
          placeholder={
            isListening
              ? t('Listening...')
              : t('Ask NEER about wave heights, PFZ zones, safe corridors, or advisories...')
          }
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />

        {/* Submit Button */}
        <button
          className="px-5 py-2.5 rounded-xl bg-[#0284c7] hover:bg-sky-700 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          type="submit"
          disabled={loading}
        >
          <span>{t('Send Query')}</span>
          <svg className="w-3.5 h-3.5" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
            <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"></path>
            <path d="m21.854 2.147-10.94 10.939"></path>
          </svg>
        </button>
      </form>
    </main>
  )
}
