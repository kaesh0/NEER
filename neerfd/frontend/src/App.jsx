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
import { INDIAN_COASTAL_PLACES } from './utils/coastalGeocoder.js'
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
      if (vParam === 'login' || vParam === 'register' || vParam === 'choosing' || vParam === 'landing') return vParam
    } catch (_) {}
    return 'workspace'
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

  // Default location: Kochi, Kerala or from URL query (?location=mumbai)
  const [selectedLocation, setSelectedLocation] = useState(() => {
    if (typeof window !== 'undefined') {
      const locParam = new URLSearchParams(window.location.search).get('location')
      if (locParam) {
        const match = INDIAN_COASTAL_PLACES.find(
          (p) =>
            p.name.toLowerCase() === locParam.toLowerCase() ||
            p.name.toLowerCase().includes(locParam.toLowerCase()) ||
            locParam.toLowerCase().includes(p.name.toLowerCase())
        )
        if (match) {
          return {
            name: `${match.name}, ${match.admin}`,
            lat: match.lat,
            lng: match.lng,
          }
        }
        return { name: locParam }
      }
    }
    return {
      name: 'Kochi, Kerala',
      lat: 9.9312,
      lng: 76.2673,
    }
  })

  // ── Live data hook for fisherman/authority (marine routes use reference coastal model) ──
  const shouldFetch = persona === 'fisherman' || persona === 'authority'
  const { data: analysisData, loading: analysisLoading, error: analysisError, refetch: analysisRefetch } =
    useMarineAnalysis(shouldFetch ? persona : null, shouldFetch ? selectedLocation : null)

  // Handle location change across header, map, and analysis
  const handleLocationChange = (newLoc) => {
    let resolved = newLoc
    if (resolved.lat == null || resolved.lng == null) {
      const match = INDIAN_COASTAL_PLACES.find(
        (p) =>
          p.name.toLowerCase().includes(resolved.name.toLowerCase()) ||
          resolved.name.toLowerCase().includes(p.name.toLowerCase())
      )
      if (match) {
        resolved = {
          name: `${match.name}, ${match.admin}`,
          lat: match.lat,
          lng: match.lng,
        }
      }
    }
    setSelectedLocation(resolved)
    if (resolved.lat != null && resolved.lng != null) {
      setMapFocusPoint({ type: 'location', lat: resolved.lat, lng: resolved.lng, zoom: 10 })
    }
    // Update URL query parameter
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      const cleanName = (resolved.name || '').split(',')[0].trim().toLowerCase()
      if (cleanName) {
        url.searchParams.set('location', cleanName)
        window.history.replaceState({}, '', url.toString())
      }
    }
  }

  // Derive location name for AppHeader based on active persona
  const locationName = useMemo(() => {
    if (persona === 'marine') return selectedLocation.name || 'Kochi Port · Lakshadweep'
    if (analysisData) {
      if (persona === 'fisherman') return getLocation(analysisData).name || selectedLocation.name
      if (persona === 'authority') return getAuthorityRequest(analysisData)?.geometry?.label || selectedLocation.name
    }
    return selectedLocation.name
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

  const navItems = persona === 'authority' ? [
    { id: 'home', label: t('Overview'), icon: 'home', active: activeTab === 'home', onClick: () => navigateToTab('home') },
    { id: 'map', label: t('Map'), icon: 'map', active: activeTab === 'map', onClick: () => navigateToTab('map') },
    { id: 'areas', label: t('Areas'), icon: 'target', active: activeTab === 'areas', onClick: () => navigateToTab('areas') },
    { id: 'alerts', label: t('Alerts'), icon: 'bell', active: activeTab === 'alerts', onClick: () => navigateToTab('alerts'), badge: 1 },
    { id: 'chat', label: t('Ask NEER'), icon: 'messageCircle', active: activeTab === 'chat', onClick: () => navigateToTab('chat') },
  ] : persona === 'marine' ? [
    { id: 'home', label: t('Overview'), icon: 'home', active: activeTab === 'home', onClick: () => navigateToTab('home') },
    { id: 'route', label: t('Route'), icon: 'mapPin', active: activeTab === 'route', onClick: () => navigateToTab('route') },
    { id: 'map', label: t('Map'), icon: 'map', active: activeTab === 'map', onClick: () => navigateToTab('map') },
    { id: 'areas', label: t('Areas'), icon: 'target', active: activeTab === 'areas', onClick: () => navigateToTab('areas') },
    { id: 'alerts', label: t('Alerts'), icon: 'bell', active: activeTab === 'alerts', onClick: () => navigateToTab('alerts'), badge: 2 },
    { id: 'chat', label: t('Ask NEER'), icon: 'messageCircle', active: activeTab === 'chat', onClick: () => navigateToTab('chat') },
  ] : [
    { id: 'home', label: t('Overview'), icon: 'home', active: activeTab === 'home', onClick: () => navigateToTab('home') },
    { id: 'map', label: t('Map'), icon: 'map', active: activeTab === 'map', onClick: () => navigateToTab('map') },
    { id: 'zones', label: t('Areas'), icon: 'fish', active: activeTab === 'zones', onClick: () => navigateToTab('zones') },
    { id: 'alerts', label: t('Alerts'), icon: 'bell', active: activeTab === 'alerts', onClick: () => navigateToTab('alerts'), badge: 1 },
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
          setCurrentView('workspace')
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
          setCurrentView('workspace')
        }} 
      />
    )
  }

  if (!persona || persona === 'none' || currentView === 'landing' || currentView === 'choosing') {
    return (
      <PersonaSelection 
        onSelectPersona={(p) => {
          const chosen = (p === 'maritime_operator' || p === 'marine') ? 'marine' : p
          if (!user) loginAsGuest()
          if (user) updateUserRole(chosen)
          setPersona(chosen)
          setActiveTab('home')
          setCurrentView('workspace')
        }}
        onNavigate={(view) => {
          if (view === 'landing' || view === 'choosing') {
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
              />
            )}
            {activeTab === 'zones' && <FishermanZones data={analysisData} loading={analysisLoading} error={analysisError} onRetry={analysisRefetch} onNavigate={navigateToTab} />}
            {activeTab === 'alerts' && <FishermanAlerts data={analysisData} loading={analysisLoading} error={analysisError} onRetry={analysisRefetch} onNavigate={navigateToTab} />}
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
              />
            )}
            {activeTab === 'alerts' && <AuthorityAlerts data={analysisData} loading={analysisLoading} error={analysisError} onRetry={analysisRefetch} onNavigate={navigateToTab} />}
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
              />
            )}
            {activeTab === 'route' && (
              <MarineRoute
                onNavigate={navigateToTab} 
              />
            )}
            {activeTab === 'map' && (
              <MarineMap 
                focusPoint={mapFocusPoint} 
                setFocusPoint={setMapFocusPoint} 
                onNavigate={navigateToTab}
                exploredLocation={exploredLocation}
                setExploredLocation={setExploredLocation}
                onLocationChange={handleLocationChange}
              />
            )}
            {activeTab === 'areas' && (
              <MarineAreas onNavigate={navigateToTab} />
            )}
            {activeTab === 'alerts' && <MarineAlerts onNavigate={navigateToTab} />}
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
      {activeTab !== 'chat' && <AskNEERButton onClick={() => setChatOpen(true)} />}

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
