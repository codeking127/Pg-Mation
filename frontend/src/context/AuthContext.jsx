import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { auth, googleProvider } from '../firebase'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, signInWithPopup } from 'firebase/auth'
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

    const loginWithGoogle = useCallback(async (role = null) => {
        await signInWithPopup(auth, googleProvider)
        try {
            const res = await userService.me()
            setUser(res.data)
            return res.data
        } catch (error) {
            if (error.response?.status === 404 && error.response?.data?.detail === "USER_NEEDS_ROLE_REGISTRATION") {
                if (role) {
                    // Register page already provided a role, complete silently
                    const regRes = await userService.completeRegistration({ role })
                    setUser(regRes.data)
                    return regRes.data
                } else {
                    // Login page doesn't know the role, throw to UI
                    const err = new Error("USER_NEEDS_ROLE_REGISTRATION")
                    err.needsRole = true
                    throw err
                }
            }
            throw error
        }
    }, [])

    const completeGoogleRegistration = useCallback(async (role) => {
        const regRes = await userService.completeRegistration({ role })
        setUser(regRes.data)
        return regRes.data
    }, [])

    const logout = useCallback(async () => {
        await signOut(auth)
        setUser(null)
    }, [])

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, loginWithGoogle, completeGoogleRegistration }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
    return ctx
}
