import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Building2, Eye, EyeOff, Loader2 } from 'lucide-react'

const ROLE_DEMO = [
    { role: 'ADMIN', email: 'admin@pg.com', password: 'Admin@123', color: 'violet' },
]

export default function Login() {
    const { login, loginWithGoogle, completeGoogleRegistration } = useAuth()
    const navigate = useNavigate()
    const [form, setForm] = useState({ email: '', password: '' })
    const [showPass, setShowPass] = useState(false)
    const [error, setError] = useState('')
    const [pendingMessage, setPendingMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [needsRole, setNeedsRole] = useState(false)
    const [role, setRole] = useState('TENANT')


    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const user = await login(form.email, form.password)
            const map = { ADMIN: '/admin', OWNER: '/owner', TENANT: '/tenant', SECURITY: '/security' }
            navigate(map[user.role] || '/')
        } catch (err) {
            const msg = err.response?.data?.message || 'Invalid credentials'
            if (msg.includes('Your account is pending Admin approval')) {
                setPendingMessage('Your account application has been successfully sent to the Admin for review. You will be able to log in once they approve it.')
            } else if (msg.includes('Your application to register was rejected')) {
                setError('Your application to register was rejected by the Admin.')
            } else {
                setError(msg)
            }
        } finally {

            setLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        setError('')
        setLoading(true)
        try {
            const user = await loginWithGoogle()
            const map = { ADMIN: '/admin', OWNER: '/owner', TENANT: '/tenant', SECURITY: '/security' }
            navigate(map[user.role] || '/')
        } catch (err) {
            if (err.needsRole) {
                setNeedsRole(true)
            } else {
                setError(err.response?.data?.message || err.message || 'Google login failed')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleCompleteRegistration = async () => {
        setError('')
        setLoading(true)
        try {
            const user = await completeGoogleRegistration(role)
            const map = { ADMIN: '/admin', OWNER: '/owner', TENANT: '/tenant', SECURITY: '/security' }
            navigate(map[user.role] || '/')
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Registration failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
            {/* Animated gradient blobs */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary-600/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            <div className="relative w-full max-w-md px-6">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 shadow-2xl shadow-primary-900/40 mb-4">
                        <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">PG-Mation</h1>
                    <p className="text-slate-400 text-sm mt-1">Smart PG Management System</p>
                </div>

                {/* Card */}
                <div className="glass-card p-6 md:p-8">
                    {pendingMessage ? (
                        <div className="text-center animate-slide-up space-y-4">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mb-2">
                                <Building2 className="w-8 h-8" />
                            </div>
                            <h2 className="text-xl font-semibold text-white">Application Received</h2>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                {pendingMessage}
                            </p>
                            <button onClick={() => setPendingMessage('')} className="btn-secondary w-full mt-6">
                                Return to Login
                            </button>
                        </div>
                    ) : needsRole ? (
                        <div className="space-y-5 animate-slide-up">
                            <h2 className="text-xl font-semibold text-white mb-2">Choose your role</h2>
                            <p className="text-sm text-slate-400 mb-6">Since this is your first time signing in with Google, please tell us how you want to use PG-Mation.</p>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <button
                                    type="button"
                                    onClick={() => setRole('TENANT')}
                                    className={`py-3 rounded-xl border text-sm font-medium transition-all ${role === 'TENANT'
                                        ? 'bg-primary-500/20 border-primary-500 text-primary-300'
                                        : 'bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-400'
                                        }`}
                                >
                                    Looking for a PG
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('OWNER')}
                                    className={`py-3 rounded-xl border text-sm font-medium transition-all ${role === 'OWNER'
                                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                                        : 'bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-400'
                                        }`}
                                >
                                    PG Owner
                                </button>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                                    <span>⚠</span> {error}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleCompleteRegistration}
                                disabled={loading}
                                className="btn-primary w-full py-3 mt-4 flex justify-center items-center"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Registration'}
                            </button>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-xl font-semibold text-white mb-6">Sign in to continue</h2>
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="label">Email address</label>
                                    <input
                                        id="email"
                                        type="email"
                                        className="input"
                                        placeholder="you@example.com"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                                <div>
                                    <label className="label">Password</label>
                                    <div className="relative">
                                        <input
                                            id="password"
                                            type={showPass ? 'text' : 'password'}
                                            className="input pr-10"
                                            placeholder="••••••••"
                                            value={form.password}
                                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                                            required
                                            autoComplete="current-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPass(!showPass)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                                        >
                                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                                        <span>⚠</span> {error}
                                    </div>
                                )}

                                <button id="login-btn" type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign In'}
                                </button>

                                <div className="text-center mt-4">
                                    <p className="text-sm text-slate-400">
                                        Don't have an account?{' '}
                                        <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                                            Register here
                                        </Link>
                                    </p>
                                </div>
                            </form>

                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-800"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-slate-900/80 text-slate-500">Or continue with</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                className="w-full py-3 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-white font-medium flex items-center justify-center gap-3 transition-colors"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Google
                            </button>

                            <div className="mt-6 pt-6 border-t border-slate-800">
                                <p className="text-xs text-slate-500 mb-3">Default credentials:</p>
                                {ROLE_DEMO.map((d) => (
                                    <button
                                        key={d.role}
                                        onClick={() => setForm({ email: d.email, password: d.password })}
                                        className="w-full text-left text-xs px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800
                                   border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                                    >
                                        <span className="font-semibold text-primary-400">{d.role}</span>
                                        &nbsp;·&nbsp;{d.email}&nbsp;/&nbsp;{d.password}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

            </div>
        </div>
    )
}
