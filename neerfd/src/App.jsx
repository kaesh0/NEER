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
import MarineAlerts from './pages/marine/MarineAlerts.jsx'

import AskNEERModal from './components/chat/AskNEERModal.jsx'
import AskNEERButton from './components/chat/AskNEERButton.jsx'
import { useTranslation } from './i18n/translations.js'
import Login from './pages/auth/Login.jsx'
import Register from './pages/auth/Register.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { useHomeLocation } from './context/LocationContext.jsx'
import LocationGateModal from './components/location/LocationGateModal.jsx'
import { useMarineAnalysis, prefetchAnalysis } from './hooks/useMarineAnalysis.js'
import { getLocation } from './data/mock/fishermanData.js'
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
  const { homeLocation, hasHomeLocation, setHomeLocation } = useHomeLocation()
  const [currentView, setCurrentView] = useState('workspace') // 'workspace', 'login', 'register'
  const [persona, setPersona] = useState(() => {
    if (user && user.role) {
      return (user.role === 'maritime_operator' || user.role === 'marine') ? 'marine' : user.role
    }
    return null
  })
  const [activeTab, setActiveTab] = useState('home')
  const [chatOpen, setChatOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // Navigation state for interactive map cross-linking
  const [mapFocusPoint, setMapFocusPoint] = useState(null)
  
  // Explored location state for map clicks
  const [exploredLocation, setExploredLocation] = useState(null)

  // Location gate: guests (and users with no saved location) must pick their
  // waters before entering a workspace. Also opened from the header chip.
  const [locationGateOpen, setLocationGateOpen] = useState(false)
  const [gateDismissed, setGateDismissed] = useState(false)

  // ── Live data hook for fisherman/authority (marine stays on static mocks) ──
  const shouldFetch = persona === 'fisherman' || persona === 'authority'
  const { data: analysisData, loading: analysisLoading, error: analysisError, refetch: analysisRefetch } =
    useMarineAnalysis(shouldFetch ? persona : null, homeLocation)

  // Boot prefetch: warm the analysis cache in the background while the user is
  // still on the landing/persona screen, so entering a workspace is instant.
  useEffect(() => {
    if (hasHomeLocation) {
      prefetchAnalysis('fisherman', homeLocation)
      prefetchAnalysis('authority', homeLocation)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Derive location name for AppHeader — the user's chosen home location is
  // the source of truth; analysis data only fills it in before it's loaded.
  const locationName = useMemo(() => {
    if (homeLocation?.name) return homeLocation.name
    if (!analysisData) return ''
    if (persona === 'fisherman') return getLocation(analysisData).name
    if (persona === 'authority') return getAuthorityRequest(analysisData)?.geometry?.label || ''
    return ''
  }, [analysisData, persona, homeLocation])

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
    { id: 'afab', label: t('Ask NEER'), icon: 'messageCircle', active: false, onClick: () => setChatOpen(true) },
  ] : persona === 'marine' ? [
    { id: 'home', label: t('Overview'), icon: 'home', active: activeTab === 'home', onClick: () => navigateToTab('home') },
    { id: 'route', label: t('Route'), icon: 'mapPin', active: activeTab === 'route', onClick: () => navigateToTab('route') },
    { id: 'map', label: t('Map'), icon: 'map', active: activeTab === 'map', onClick: () => navigateToTab('map') },
    { id: 'alerts', label: t('Alerts'), icon: 'bell', active: activeTab === 'alerts', onClick: () => navigateToTab('alerts'), badge: 1 },
    { id: 'afab', label: t('Ask NEER'), icon: 'messageCircle', active: false, onClick: () => setChatOpen(true) },
  ] : persona === 'fisherman' ? [
    { id: 'home', label: t('Home'), icon: 'home', active: activeTab === 'home', onClick: () => navigateToTab('home') },
    { id: 'map', label: t('Map'), icon: 'map', active: activeTab === 'map', onClick: () => navigateToTab('map') },
    { id: 'zones', label: t('Zones'), icon: 'fish', active: activeTab === 'zones', onClick: () => navigateToTab('zones') },
    { id: 'alerts', label: t('Alerts'), icon: 'bell', active: activeTab === 'alerts', onClick: () => navigateToTab('alerts'), badge: 2 },
    { id: 'afab', label: t('Ask NEER'), icon: 'messageCircle', active: false, onClick: () => setChatOpen(true) },
  ] : [
    { id: 'home', label: t('Home'), icon: 'home', active: activeTab === 'home', onClick: () => navigateToTab('home') },
    { id: 'map', label: t('Map'), icon: 'map', active: activeTab === 'map', onClick: () => navigateToTab('map') },
    { id: 'zones', label: t('Zones'), icon: 'fish', active: activeTab === 'zones', onClick: () => navigateToTab('zones') },
    { id: 'alerts', label: t('Alerts'), icon: 'bell', active: activeTab === 'alerts', onClick: () => navigateToTab('alerts') },
    { id: 'afab', label: t('Ask NEER'), icon: 'messageCircle', active: false, onClick: () => setChatOpen(true) },
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
        onChangeLocation: () => setLocationGateOpen(true),
        onNavigate: (view) => {
          if (view === 'landing') {
            setPersona(null)
            setActiveTab('home')
            setCurrentView('workspace')
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
              />
            )}
            {activeTab === 'zones' && <FishermanZones data={analysisData} loading={analysisLoading} error={analysisError} onRetry={analysisRefetch} onNavigate={navigateToTab} />}
            {activeTab === 'alerts' && <FishermanAlerts data={analysisData} loading={analysisLoading} error={analysisError} onRetry={analysisRefetch} onNavigate={navigateToTab} />}
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
              />
            )}
            {activeTab === 'alerts' && <MarineAlerts onNavigate={navigateToTab} />}
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
      <AskNEERButton onClick={() => setChatOpen(true)} />

      {persona && !hasHomeLocation && !gateDismissed && (
        <LocationGateModal
          skippable={!!isGuest || !user}
          onSkip={() => setGateDismissed(true)}
          onSave={(loc) => {
            setHomeLocation(loc)
            setGateDismissed(false)
          }}
        />
      )}

      {locationGateOpen && (
        <LocationGateModal
          current={homeLocation}
          skippable={false}
          onSkip={null}
          onSave={(loc) => {
            setHomeLocation(loc)
            setLocationGateOpen(false)
          }}
        />
      )}

      {chatOpen && (
        <AskNEERModal
          persona={persona || 'fisherman'}
          onClose={() => setChatOpen(false)}
        />
      )}
    </AppShell>
  )
}
