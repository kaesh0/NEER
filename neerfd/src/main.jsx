import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { LocationProvider } from './context/LocationContext.jsx'

const container = document.getElementById('root')
createRoot(container).render(
  <StrictMode>
    <LanguageProvider>
      <LocationProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LocationProvider>
    </LanguageProvider>
  </StrictMode>,
)

// First paint done — drop the cold-start splash from index.html.
requestAnimationFrame(() => {
  document.getElementById('neer-splash')?.remove()
})
