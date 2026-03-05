import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Building2, Mail, Lock, User, Phone, Loader2, ArrowRight } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'


export default function Register() {
    const navigate = useNavigate()
    const { login } = useAuth()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'TENANT'
    })

    const handleRegister = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            // Register user
            await api.post('/auth/register', form)

            // Log them in immediately after
            await login(form.email, form.password)

            // Navigate based on role
            if (form.role === 'TENANT') {
                navigate('/browse-pgs') // Redirect to browse PGs immediately
            } else {
                navigate('/owner')
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-600/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-md w-full mx-auto relative z-10">
                <div className="text-center mb-10 animate-fade-in">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary-500/20">
                        <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Create an Account</h1>
                    <p className="text-slate-400">Join PG-Mation to find or manage properties</p>
                </div>

                <div className="card border-slate-800/60 shadow-2xl p-8 backdrop-blur-xl bg-slate-900/80 animate-slide-up">
                    <form onSubmit={handleRegister} className="space-y-5">
                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 text-red-400 animate-fade-in">
                                <div className="text-sm font-medium">{error}</div>
                            </div>
                        )}

                        <div>
                            <label className="label">I am a...</label>
                            <div className="grid grid-cols-2 gap-3 mt-1">
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, role: 'TENANT' })}
                                    className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${form.role === 'TENANT'
                                        ? 'bg-primary-500/20 border-primary-500 text-primary-300'
                                        : 'bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-400'
                                        }`}
                                >
                                    Looking for a PG
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, role: 'OWNER' })}
                                    className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${form.role === 'OWNER'
                                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                                        : 'bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-400'
                                        }`}
                                >
                                    PG Owner
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="label">Full Name</label>
                            <div className="relative">
                                <User className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    className="input pl-11"
                                    placeholder="John Doe"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="label">Email Address</label>
                            <div className="relative">
                                <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="email"
                                    className="input pl-11"
                                    placeholder="name@example.com"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="label">Phone Number (Optional)</label>
                            <div className="relative">
                                <Phone className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="tel"
                                    className="input pl-11"
                                    placeholder="+91 9876543210"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="label">Password</label>
                            <div className="relative">
                                <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="password"
                                    className="input pl-11"
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-3 mt-4 text-base font-semibold flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Create Account
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-slate-400 mt-8 text-sm">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                        Sign in instead
                    </Link>
                </p>
            </div>
        </div>
    )
}
