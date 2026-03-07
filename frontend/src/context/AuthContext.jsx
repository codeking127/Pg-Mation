import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { auth } from '../firebase'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { userService } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    // Fetch full user profile (role, etc.) from our backend
                    const res = await userService.me()
                    setUser(res.data)
                } catch (error) {
                    console.error("Failed to fetch user profile from custom backend:", error)
                    setUser(null)
                }
            } else {
                setUser(null)
            }
            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    const login = useCallback(async (email, password) => {
        // Firebase Auth login
        await signInWithEmailAndPassword(auth, email, password)
        // Fetch profile immediately to return the full user object with role for navigation
        const res = await userService.me()
        setUser(res.data)
        return res.data
    }, [])

    const logout = useCallback(async () => {
        await signOut(auth)
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
