import { useState, useEffect, useMemo } from 'react'
import { Icon } from './icons/index.js'
import AppShell from './components/layout/AppShell.jsx'
import MobileNav from './components/layout/MobileNav.jsx'
import FishermanHome from './pages/fisherman/FishermanHome.jsx'
import PersonaSelection from './pages/PersonaSelection.jsx'
import FishermanMap from './pages/fisherman/FishermanMap.jsx'
import FishermanZones from './pages/fisherman/FishermanZones.jsx'
import FishermanAlerts from './pages/fisherman/FishermanAlerts.jsx'

import AuthorityHome from './pages/authority/AuthorityHome.jsx'
import AuthorityMap from './pages/authority/AuthorityMap.jsx'
import AuthorityAreas from './pages/authority/AuthorityAreas.jsx'
import AuthorityAlerts from './pages/authority/AuthorityAlerts.jsx'

import MarineHome from './pages/marine/MarineHome.jsx'
import MarineRoute from './pages/marine/MarineRoute.jsx'
import MarineMap from './pages/marine/MarineMap.jsx'
import MarineAreas from './pages/marine/MarineAreas.jsx'
import MarineAlerts from './pages/marine/MarineAlerts.jsx'

import AskNEERModal from './components/chat/AskNEERModal.jsx'
import AskNEERButton from './components/chat/AskNEERButton.jsx'
import AskNEERSection from './pages/chat/AskNEERSection.jsx'
import { useTranslation } from './i18n/translations.js'
import Login from './pages/auth/Login.jsx'
import Register from './pages/auth/Register.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { useMarineAnalysis } from './hooks/useMarineAnalysis.js'
import { getLocation } from './data/mock/fishermanData.js'
import { INDIAN_COASTAL_PLACES, classifyLocation, detectUserCurrentLocation } from './utils/coastalGeocoder.js'
import { getRequest as getAuthorityRequest } from './data/mock/authorityData.js'
import LoadingState from './components/ui/LoadingState.jsx'
import ErrorState from './components/ui/ErrorState.jsx'
import SelectPersonaFirst from './components/layout/SelectPersonaFirst.jsx'
import FallbackNotice from './components/ui/FallbackNotice.jsx'

function FadeTransition({ activeKey, children }) {
  const { t } = useTranslation()

  const [displayChildren, setDisplayChildren] = useState(children)
  const [transitionClass, setTransitionClass] = useState('opacity-100')

  useEffect(() => {
    if (activeKey !== displayChildren.key) {
      setTransitionClass('opacity-0 scale-[0.99]')
      const timeout = setTimeout(() => {
        setDisplayChildren(children)
        setTransitionClass('opacity-100 scale-100')
      }, 150)
      return () => clearTimeout(timeout)
    }
  }, [activeKey, children, displayChildren.key])

  return (
    <div className={`transition-all duration-300 ease-in-out ${transitionClass} motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:scale-100 h-full`}>
      {displayChildren}
    </div>
  )
}

export default function App() {
  const { user, isGuest, loginAsGuest, updateUserRole } = useAuth()
  const [currentView, setCurrentView] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const vParam = params.get('view')
      if (vParam === 'login' || vParam === 'register' || vParam === 'choosing' || vParam === 'landing' || vParam === 'workspace') return vParam
    } catch (_) {}
    return 'login'
  })
  const [persona, setPersona] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const pParam = params.get('persona')
      if (pParam) {
        if (pParam === 'none' || pParam === 'null' || pParam === 'landing' || pParam === 'choosing') return null
        return (pParam === 'maritime_operator' || pParam === 'marine') ? 'marine' : pParam
      }
    } catch (_) {}
    if (user && user.role) {
      return (user.role === 'maritime_operator' || user.role === 'marine') ? 'marine' : user.role
    }
    // Guest / non-logged-in users always land on the Choosing page on initial open or reload
    try {
      localStorage.removeItem('neer-selected-persona')
    } catch (_) {}
    return null
  })
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const tParam = params.get('tab')
      const pParam = params.get('persona')
      if (tParam) {
        if (tParam === 'areas' && (!pParam || pParam === 'fisherman')) return 'zones'
        return tParam
      }
    } catch (_) {}
    return 'home'
  })
  const [chatOpen, setChatOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // Navigation state for interactive map cross-linking
  const [mapFocusPoint, setMapFocusPoint] = useState(null)
  
  // Explored location state for map clicks
  const [exploredLocation, setExploredLocation] = useState(null)

  // Selected location state: dynamically detected from browser geolocation or saved preference
  const [selectedLocation, setSelectedLocation] = useState(() => {
    if (typeof window !== 'undefined') {
      // 1. Check if user already has a saved detected/chosen location
      try {
        const saved = localStorage.getItem('neer_user_location')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed && parsed.name && !parsed.isFallback) {
            return parsed
          }
        }
      } catch (e) {}

      // 2. Check URL search parameters
      const params = new URLSearchParams(window.location.search)
      const locParam = params.get('location')
      const latParam = params.get('lat')
      const lngParam = params.get('lng')
      if (latParam && lngParam) {
        return classifyLocation({ lat: latParam, lng: lngParam, name: locParam })
      }
      if (locParam) {
        return classifyLocation({ name: locParam }) || { name: locParam, isCoastal: false }
      }
    }
    return {
      name: 'Detecting Location...',
      isDetecting: true,
      lat: null,
      lng: null,
      isCoastal: false,
    }
  })

  // Bootstrap live user device geolocation on initial launch
  useEffect(() => {
    let isCancelled = false

    async function initLocation() {
      // If user has a valid URL parameter, do not override
      const params = new URLSearchParams(window.location.search)
      if (params.get('location') || (params.get('lat') && params.get('lng'))) {
        return
      }

      // Detect current location via high-accuracy device GPS, then IP geolocation fallback
      const detected = await detectUserCurrentLocation({ timeoutMs: 6000 })
      if (isCancelled) return

      if (detected) {
        setSelectedLocation(detected)
        try {
          localStorage.setItem('neer_user_location', JSON.stringify(detected))
        } catch (e) {}
      } else {
        // If neither GPS nor IP succeeded, check if a saved location exists
        setSelectedLocation((prev) => {
          if (prev && prev.name && !prev.isDetecting) return prev
          try {
            const saved = localStorage.getItem('neer_user_location')
            if (saved) {
              const parsed = JSON.parse(saved)
              if (parsed && parsed.name) return parsed
            }
          } catch (e) {}
          return {
            name: 'Coastal Waters',
            lat: 18.9667,
            lng: 72.8333,
            isCoastal: true,
            isFallback: true,
          }
        })
      }
    }

    initLocation()

    return () => {
      isCancelled = true
    }
  }, [])

  // ── Live data hook for fisherman/authority (marine routes use reference coastal model) ──
  const shouldFetch = persona === 'fisherman' || persona === 'authority'
  const { data: analysisData, loading: analysisLoading, error: analysisError, refetch: analysisRefetch } =
    useMarineAnalysis(shouldFetch ? persona : null, shouldFetch ? selectedLocation : null)

  // Handle location change across header, map, and analysis
  const handleLocationChange = (newLoc) => {
    const classified = classifyLocation(newLoc) || newLoc
    setSelectedLocation(classified)
    try {
      localStorage.setItem('neer_user_location', JSON.stringify(classified))
    } catch (e) {}
    if (classified.lat != null && classified.lng != null) {
      setMapFocusPoint({ type: 'location', lat: classified.lat, lng: classified.lng, zoom: 10 })
    }
    if (exploredLocation) setExploredLocation(null)
  }

  // Derive location name for AppHeader based on active persona
  const locationName = useMemo(() => {
    if (selectedLocation?.name && !selectedLocation?.isFallback) {
      return selectedLocation.name
    }
    if (selectedLocation?.isDetecting) {
      return 'Detecting Location...'
    }
    if (persona === 'marine') return selectedLocation?.name || 'Coastal Port'
    if (analysisData) {
      if (persona === 'fisherman' && getLocation(analysisData)?.name) return getLocation(analysisData).name
      if (persona === 'authority' && getAuthorityRequest(analysisData)?.geometry?.label) return getAuthorityRequest(analysisData).geometry.label
    }
    return selectedLocation?.name || 'Coastal Sector'
  }, [analysisData, persona, selectedLocation])

  // Center map when live analysis coordinates are resolved
  useEffect(() => {
    if (!analysisData || persona === 'marine') return
    const coords = analysisData.request?.geometry?.coordinates
    if (Array.isArray(coords) && coords.length === 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      // coords format is [longitude, latitude]
      setMapFocusPoint({ type: 'location', lat: coords[1], lng: coords[0], zoom: 10 })
    }
  }, [analysisData, persona])

  // Auth integration — restore persona for logged-in user across sessions
  useEffect(() => {
    if (user && user.role) {
      const normalizedRole = (user.role === 'maritime_operator' || user.role === 'marine') ? 'marine' : user.role
      setPersona(normalizedRole)
      setCurrentView('workspace')
    }
  }, [user])

  const navigateToTab = (tab, focusPoint = null) => {
    if (focusPoint) {
      setMapFocusPoint(focusPoint)
    }
    setActiveTab(tab)
  }

  const { t } = useTranslation()

  const isSelectedInland = selectedLocation?.isCoastal === false || analysisData?.is_coastal === false

  const navItems = persona === 'authority' ? [
    { id: 'home', label: t('Overview'), icon: 'home', active: activeTab === 'home', onClick: () => navigateToTab('home') },
    { id: 'map', label: t('Map'), icon: 'map', active: activeTab === 'map', onClick: () => navigateToTab('map') },
    { id: 'areas', label: t('Areas'), icon: 'target', active: activeTab === 'areas', onClick: () => navigateToTab('areas') },
    { id: 'alerts', label: t('Alerts'), icon: 'bell', active: activeTab === 'alerts', onClick: () => navigateToTab('alerts'), badge: isSelectedInland ? 0 : 1 },
    { id: 'chat', label: t('Ask NEER'), icon: 'messageCircle', active: activeTab === 'chat', onClick: () => navigateToTab('chat') },
  ] : persona === 'marine' ? [
    { id: 'home', label: t('Overview'), icon: 'home', active: activeTab === 'home', onClick: () => navigateToTab('home') },
    { id: 'route', label: t('Route'), icon: 'mapPin', active: activeTab === 'route', onClick: () => navigateToTab('route') },
    { id: 'map', label: t('Map'), icon: 'map', active: activeTab === 'map', onClick: () => navigateToTab('map') },
    { id: 'areas', label: t('Areas'), icon: 'target', active: activeTab === 'areas', onClick: () => navigateToTab('areas') },
    { id: 'alerts', label: t('Alerts'), icon: 'bell', active: activeTab === 'alerts', onClick: () => navigateToTab('alerts'), badge: isSelectedInland ? 0 : 2 },
    { id: 'chat', label: t('Ask NEER'), icon: 'messageCircle', active: activeTab === 'chat', onClick: () => navigateToTab('chat') },
  ] : [
    { id: 'home', label: t('Overview'), icon: 'home', active: activeTab === 'home', onClick: () => navigateToTab('home') },
    { id: 'map', label: t('Map'), icon: 'map', active: activeTab === 'map', onClick: () => navigateToTab('map') },
    { id: 'zones', label: t('Areas'), icon: 'fish', active: activeTab === 'zones', onClick: () => navigateToTab('zones') },
    { id: 'alerts', label: t('Alerts'), icon: 'bell', active: activeTab === 'alerts', onClick: () => navigateToTab('alerts'), badge: isSelectedInland ? 0 : 1 },
    { id: 'chat', label: t('Ask NEER'), icon: 'messageCircle', active: activeTab === 'chat', onClick: () => navigateToTab('chat') },
  ]

  if (currentView === 'login') {
    return (
      <Login 
        onNavigate={setCurrentView} 
        onLoginSuccess={(role) => {
          if (role) {
            const normalized = (role === 'maritime_operator' || role === 'marine') ? 'marine' : role
            setPersona(normalized)
          }
          setActiveTab('home')
          setCurrentView('choosing')
        }} 
      />
    )
  }

  if (currentView === 'register') {
    return (
      <Register 
        onNavigate={setCurrentView} 
        onRegisterSuccess={(role) => {
          if (role) {
            const normalized = (role === 'maritime_operator' || role === 'marine') ? 'marine' : role
            setPersona(normalized)
          }
          setActiveTab('home')
          setCurrentView('choosing')
        }} 
      />
    )
  }

  if (!persona || persona === 'none' || currentView === 'landing' || currentView === 'choosing') {
    return (
      <PersonaSelection 
        selectedLocation={selectedLocation}
        onSelectPersona={(p) => {
          const chosen = (p === 'maritime_operator' || p === 'marine') ? 'marine' : p
          if (!user) loginAsGuest()
          if (user) updateUserRole(chosen)
          setPersona(chosen)
          setActiveTab('home')
          setCurrentView('workspace')
        }}
        onNavigate={(view) => {
          if (view === 'login' || view === 'register') {
            setCurrentView(view)
          } else if (view === 'landing' || view === 'choosing') {
            setPersona(null)
            setActiveTab('home')
            setCurrentView('choosing')
          } else {
            setCurrentView(view)
          }
        }}
      />
    )
  }

  const isFallbackData = analysisData?.servedFrom === 'fallback_mock' ||
    analysisData?.provenance?.status === 'fallback' ||
    analysisData?.provenance?.overallStatus === 'fallback'

  return (
    <AppShell
      banner={isFallbackData ? <FallbackNotice onRetry={analysisRefetch} /> : null}
      header={{
        title: persona === 'fisherman' ? t('NEER Fisherman') : persona === 'marine' ? t('NEER Maritime Operations') : persona === 'authority' ? t('NEER Authority') : 'NEER',
        persona,
        onPersonaChange: (p) => {
          const chosen = (p === 'maritime_operator' || p === 'marine') ? 'marine' : p
          setPersona(chosen)
          if (user) updateUserRole(chosen)
          setActiveTab('home')
        },
        onMenu: () => setMobileMenuOpen(true),
        activeTab,
        onTabChange: setActiveTab,
        navItems,
        locationName,
        currentLocation: selectedLocation,
        onLocationChange: handleLocationChange,
        onNavigate: (view) => {
          if (view === 'landing' || view === 'choosing') {
            setPersona(null)
            setActiveTab('home')
            setCurrentView('choosing')
          } else {
            setCurrentView(view)
          }
        },
      }}
      bottomNav={<MobileNav items={navItems} />}
    >
      {persona === 'fisherman' ? (
        <FadeTransition activeKey={`${persona}-${activeTab}`}>
          <div key={activeTab} className="h-full">
            {activeTab === 'home' && (
              <FishermanHome 
                data={analysisData}
                loading={analysisLoading}
                error={analysisError}
                onRetry={analysisRefetch}
                chatOpen={chatOpen} 
                setChatOpen={setChatOpen} 
                onNavigate={navigateToTab} 
                exploredLocation={exploredLocation}
                setExploredLocation={setExploredLocation}
                focusPoint={mapFocusPoint}
                selectedLocation={selectedLocation}
                onLocationChange={handleLocationChange}
              />
            )}
            {activeTab === 'map' && (
              <FishermanMap 
                data={analysisData}
                loading={analysisLoading}
                error={analysisError}
                onRetry={analysisRefetch}
                focusPoint={mapFocusPoint} 
                setFocusPoint={setMapFocusPoint} 
                onNavigate={navigateToTab}
                setExploredLocation={setExploredLocation}
                exploredLocation={exploredLocation}
                onLocationChange={handleLocationChange}
                selectedLocation={selectedLocation}
              />
            )}
            {activeTab === 'zones' && (
              <FishermanZones 
                data={analysisData} 
                loading={analysisLoading} 
                error={analysisError} 
                onRetry={analysisRefetch} 
                onNavigate={navigateToTab}
                selectedLocation={selectedLocation}
                onLocationChange={handleLocationChange}
              />
            )}
            {activeTab === 'alerts' && (
              <FishermanAlerts 
                data={analysisData} 
                loading={analysisLoading} 
                error={analysisError} 
                onRetry={analysisRefetch} 
                onNavigate={navigateToTab}
                selectedLocation={selectedLocation}
                onLocationChange={handleLocationChange}
              />
            )}
            {activeTab === 'chat' && <AskNEERSection persona={persona} locationName={locationName} selectedLocation={selectedLocation} onNavigate={navigateToTab} />}
          </div>
        </FadeTransition>
      ) : persona === 'authority' ? (
        <FadeTransition activeKey={`${persona}-${activeTab}`}>
          <div key={activeTab} className="h-full">
            {activeTab === 'home' && (
              <AuthorityHome 
                data={analysisData}
                loading={analysisLoading}
                error={analysisError}
                onRetry={analysisRefetch}
                chatOpen={chatOpen} 
                setChatOpen={setChatOpen} 
                onNavigate={navigateToTab} 
                selectedLocation={selectedLocation}
                onLocationChange={handleLocationChange}
              />
            )}
            {activeTab === 'map' && (
              <AuthorityMap 
                data={analysisData}
                loading={analysisLoading}
                error={analysisError}
                onRetry={analysisRefetch}
                focusPoint={mapFocusPoint} 
                setFocusPoint={setMapFocusPoint} 
                onNavigate={navigateToTab}
                exploredLocation={exploredLocation}
                setExploredLocation={setExploredLocation}
                selectedLocation={selectedLocation}
                onLocationChange={handleLocationChange}
              />
            )}
            {activeTab === 'areas' && (
              <AuthorityAreas 
                data={analysisData}
                loading={analysisLoading}
                error={analysisError}
                onRetry={analysisRefetch}
                focusPoint={mapFocusPoint} 
                setFocusPoint={setMapFocusPoint}
                onNavigate={navigateToTab} 
                selectedLocation={selectedLocation}
                onLocationChange={handleLocationChange}
              />
            )}
            {activeTab === 'alerts' && (
              <AuthorityAlerts 
                data={analysisData} 
                loading={analysisLoading} 
                error={analysisError} 
                onRetry={analysisRefetch} 
                onNavigate={navigateToTab}
                selectedLocation={selectedLocation}
                onLocationChange={handleLocationChange}
              />
            )}
            {activeTab === 'chat' && <AskNEERSection persona={persona} locationName={locationName} selectedLocation={selectedLocation} onNavigate={navigateToTab} />}
          </div>
        </FadeTransition>
      ) : (persona === 'marine' || persona === 'maritime_operator') ? (
        <FadeTransition activeKey={`${persona}-${activeTab}`}>
          <div key={activeTab} className="h-full">
            {activeTab === 'home' && (
              <MarineHome 
                chatOpen={chatOpen} 
                setChatOpen={setChatOpen} 
                onNavigate={navigateToTab} 
                selectedLocation={selectedLocation}
                onLocationChange={handleLocationChange}
              />
            )}
            {activeTab === 'route' && (
              <MarineRoute
                onNavigate={navigateToTab} 
                selectedLocation={selectedLocation}
                onLocationChange={handleLocationChange}
              />
            )}
            {activeTab === 'map' && (
              <MarineMap 
                focusPoint={mapFocusPoint} 
                setFocusPoint={setMapFocusPoint} 
                onNavigate={navigateToTab}
                exploredLocation={exploredLocation}
                setExploredLocation={setExploredLocation}
                selectedLocation={selectedLocation}
                onLocationChange={handleLocationChange}
              />
            )}
            {activeTab === 'areas' && (
              <MarineAreas 
                onNavigate={navigateToTab} 
                selectedLocation={selectedLocation}
                onLocationChange={handleLocationChange}
              />
            )}
            {activeTab === 'alerts' && (
              <MarineAlerts 
                onNavigate={navigateToTab} 
                selectedLocation={selectedLocation}
                onLocationChange={handleLocationChange}
              />
            )}
            {activeTab === 'chat' && <AskNEERSection persona={persona} locationName={locationName} selectedLocation={selectedLocation} onNavigate={navigateToTab} />}
          </div>
        </FadeTransition>
      ) : (
        <FadeTransition activeKey={`unauth-${activeTab}`}>
          <div key={activeTab} className="h-full">
            {activeTab === 'home' ? (
              <PersonaSelection 
                hideLanguage={true}
                onSelectPersona={(p) => {
                  const chosen = (p === 'maritime_operator' || p === 'marine') ? 'marine' : p
                  if (!user) loginAsGuest()
                  if (user) updateUserRole(chosen)
                  setPersona(chosen)
                  setActiveTab('home')
                  setCurrentView('workspace')
                }}
                onNavigate={(view) => {
                  if (view === 'landing') {
                    setPersona(null)
                    setActiveTab('home')
                    setCurrentView('workspace')
                  } else {
                    setCurrentView(view)
                  }
                }}
              />
            ) : (
              <SelectPersonaFirst onSelectHome={() => setActiveTab('home')} />
            )}
          </div>
        </FadeTransition>
      )}

      {/* Global FAB Button that ignores route transitions/scaling to stay fixed to viewport */}
      {activeTab !== 'chat' && !chatOpen && <AskNEERButton onClick={() => setChatOpen(true)} />}

      {chatOpen && (
        <AskNEERModal 
          persona={persona || 'fisherman'} 
          locationName={locationName}
          selectedLocation={selectedLocation}
          onClose={() => setChatOpen(false)} 
        />
      )}
    </AppShell>
  )
}
