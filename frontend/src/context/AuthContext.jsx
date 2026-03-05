import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authService } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const token = localStorage.getItem('access_token')
        if (token) {
            authService.me()
                .then((res) => setUser(res.data.user))
                .catch(() => localStorage.removeItem('access_token'))
                .finally(() => setLoading(false))
        } else {
            setLoading(false)
        }
    }, [])

    const login = useCallback(async (email, password) => {
        const res = await authService.login({ email, password })
        localStorage.setItem('access_token', res.data.accessToken)
        setUser(res.data.user)
        return res.data.user
    }, [])

    const logout = useCallback(async () => {
        try { await authService.logout() } catch { }
        localStorage.removeItem('access_token')
        setUser(null)
    }, [])

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
    return ctx
}
