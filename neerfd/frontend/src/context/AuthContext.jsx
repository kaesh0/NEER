import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('neer-auth-user') || sessionStorage.getItem('neer-auth-user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  
  const [isGuest, setIsGuest] = useState(() => {
    return sessionStorage.getItem('neer-auth-guest') === 'true'
  })

  // Whenever user or guest state changes, sync with storage for persistence
  useEffect(() => {
    if (user) {
      localStorage.setItem('neer-auth-user', JSON.stringify(user))
      sessionStorage.setItem('neer-auth-user', JSON.stringify(user))
    } else {
      localStorage.removeItem('neer-auth-user')
      sessionStorage.removeItem('neer-auth-user')
    }
  }, [user])

  useEffect(() => {
    if (isGuest) {
      sessionStorage.setItem('neer-auth-guest', 'true')
    } else {
      sessionStorage.removeItem('neer-auth-guest')
    }
  }, [isGuest])

  const getUsersDb = () => {
    try {
      const stored = localStorage.getItem('neer-users-db')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  const saveUsersDb = (users) => {
    try {
      localStorage.setItem('neer-users-db', JSON.stringify(users))
    } catch (e) {
      console.error('Failed to persist users to localStorage', e)
    }
  }

  const login = async (emailOrMobile, password, persona) => {
    if (!emailOrMobile || !emailOrMobile.trim()) {
      throw new Error('Email or mobile number is required')
    }

    const cleanId = emailOrMobile.trim().toLowerCase()
    let chosenRole = persona || ''
    if (chosenRole === 'maritime_operator') chosenRole = 'marine'

    // Try backend authentication first
    let backendUser = null
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrMobile: cleanId, password, persona: chosenRole })
      })
      if (res.ok) {
        const body = await res.json()
        if (body?.user) {
          backendUser = body.user
        }
      }
    } catch (apiErr) {
      console.warn('Backend auth endpoint unreachable, falling back to local storage:', apiErr.message)
    }

    if (backendUser) {
      setUser(backendUser)
      setIsGuest(false)
      return backendUser
    }

    // Local fallback
    const users = getUsersDb()
    const matched = users.find(
      (u) => (u.email && u.email.toLowerCase() === cleanId) || (u.mobile && u.mobile === cleanId)
    )

    const finalRole = chosenRole || matched?.role || 'fisherman'

    const simulatedUser = {
      id: matched?.id || `u-${Date.now()}`,
      name: matched?.name || (emailOrMobile.includes('@') ? emailOrMobile.split('@')[0] : emailOrMobile),
      email: matched?.email || (emailOrMobile.includes('@') ? emailOrMobile : ''),
      mobile: matched?.mobile || (!emailOrMobile.includes('@') ? emailOrMobile : ''),
      role: finalRole,
    }

    const updated = users.filter((u) => u.email !== simulatedUser.email && u.mobile !== simulatedUser.mobile)
    updated.push(simulatedUser)
    saveUsersDb(updated)

    setUser(simulatedUser)
    setIsGuest(false)
    return simulatedUser
  }

  const register = async (details) => {
    const rawRole = details.role || details.persona || 'fisherman'
    const role = (rawRole === 'maritime_operator' || rawRole === 'marine') ? 'marine' : rawRole

    let backendUser = null
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...details, role })
      })
      if (res.ok) {
        const body = await res.json()
        if (body?.user) {
          backendUser = body.user
        }
      }
    } catch (apiErr) {
      console.warn('Backend register endpoint unreachable, falling back to local storage:', apiErr.message)
    }

    if (backendUser) {
      setUser(backendUser)
      setIsGuest(false)
      return backendUser
    }

    // Local fallback
    const simulatedUser = {
      id: `u-${Date.now()}`,
      name: details.name || 'User',
      email: details.email || '',
      mobile: details.mobile || '',
      role,
    }

    const users = getUsersDb()
    const updated = users.filter((u) => u.email !== simulatedUser.email)
    updated.push(simulatedUser)
    saveUsersDb(updated)

    setUser(simulatedUser)
    setIsGuest(false)
    return simulatedUser
  }

  const loginAsGuest = () => {
    setIsGuest(true)
    setUser(null)
  }

  const logout = () => {
    setUser(null)
    setIsGuest(false)
    localStorage.removeItem('neer-auth-user')
    sessionStorage.removeItem('neer-auth-user')
    sessionStorage.removeItem('neer-auth-guest')
  }

  const updateUserRole = async (role) => {
    const normalized = role === 'maritime_operator' ? 'marine' : role
    if (user) {
      const updated = { ...user, role: normalized }
      setUser(updated)
      try {
        await fetch('/api/auth/persona', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: user.id, identifier: user.email || user.mobile, persona: normalized })
        })
      } catch (err) {
        console.warn('Could not sync updated persona to backend:', err.message)
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest,
        login,
        register,
        loginAsGuest,
        logout,
        updateUserRole,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
