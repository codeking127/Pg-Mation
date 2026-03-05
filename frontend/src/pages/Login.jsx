import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Building2, Eye, EyeOff, Loader2 } from 'lucide-react'

const ROLE_DEMO = [
    { role: 'ADMIN', email: 'admin@pg.com', password: 'Admin@123', color: 'violet' },
]

export default function Login() {
    const { login } = useAuth()
    const navigate = useNavigate()
    const [form, setForm] = useState({ email: '', password: '' })
    const [showPass, setShowPass] = useState(false)
    const [error, setError] = useState('')
    const [pendingMessage, setPendingMessage] = useState('')
    const [loading, setLoading] = useState(false)


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
                <div className="glass-card p-8">
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
