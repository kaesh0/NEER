import React, { createContext, useContext, useState, useEffect } from 'react'


const LanguageContext = createContext()

export function LanguageProvider({ children }) {

  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('neer-language') || 'en'
  })

  useEffect(() => {
    localStorage.setItem('neer-language', language)
    document.documentElement.lang = language
  }, [language])

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
