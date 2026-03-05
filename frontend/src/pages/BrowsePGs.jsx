import { useState, useEffect } from 'react'
import { applicationService, tenantService } from '../services/api'
import { MapPin, Users, BedDouble, Search, Loader2, Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function BrowsePGs() {
    const { user } = useAuth()
    const [pgs, setPgs] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedPg, setSelectedPg] = useState(null)
    const [message, setMessage] = useState('')
    const [applying, setApplying] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [isActiveTenant, setIsActiveTenant] = useState(false)

    const loadPGs = async () => {
        setLoading(true)
        try {
            const [pgRes] = await Promise.all([
                applicationService.getPublicPGs(),
                user?.role === 'TENANT' ? tenantService.getMe().then(() => setIsActiveTenant(true)).catch(() => setIsActiveTenant(false)) : Promise.resolve()
            ])
            setPgs(pgRes.data.pgs)
        } catch (err) {
            console.error('Failed to load PGs', err)
        } finally {
            setLoading(false)
        }
    }


    useEffect(() => {
        loadPGs()
    }, [])

    const handleApply = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setApplying(true)
        try {
            await applicationService.apply({ pg_id: selectedPg.id, message })
            setSuccess('Application submitted successfully! The owner will review it soon.')
            setSelectedPg(null)
            setMessage('')
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to apply.')
        } finally {
            setApplying(false)
        }
    }

    const filtered = pgs.filter(pg =>
        pg.name?.toLowerCase().includes(search.toLowerCase()) ||
        (pg.city || '').toLowerCase().includes(search.toLowerCase())
    )


    return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-12">
            <div className="max-w-6xl mx-auto space-y-8 animate-slide-up">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Browse Available PGs</h1>
                        <p className="text-slate-400 mt-1">Find your next home and apply instantly.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {user ? (
                            <Link to={`/${user.role.toLowerCase()}`} className="btn-secondary">
                                Go to Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link to="/login" className="btn-secondary">Sign In</Link>
                                <Link to="/register" className="btn-primary">Register to Apply</Link>
                            </>
                        )}
                    </div>
                </div>

                {/* Notifications */}
                {isActiveTenant && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-3">
                        <Info className="w-5 h-5 shrink-0" />
                        <span>You are currently staying in a PG. You must first vacate your current PG to be able to submit applications for a new one.</span>
                    </div>
                )}
                {success && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3">
                        <Info className="w-5 h-5" /> {success}
                    </div>
                )}
                {error && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                        {error}
                    </div>
                )}

                {/* Search */}
                <div className="relative max-w-xl">
                    <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search by PG name or city..."
                        className="input pl-12 h-12 text-lg"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary-500" /></div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 text-slate-500">No PGs found matching your search.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map(pg => (
                            <div key={pg.id} className="card hover:border-primary-500/50 transition-colors flex flex-col h-full">
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-white mb-2">{pg.name}</h3>

                                    <div className="space-y-3 mt-4">
                                        <div className="flex items-start gap-2 text-slate-400 text-sm">
                                            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                            <span>{pg.address}, {pg.city} - {pg.pincode}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                                            <BedDouble className="w-4 h-4 shrink-0" />
                                            <span>
                                                <strong className={pg.available_beds > 0 ? "text-emerald-400" : "text-red-400"}>
                                                    {pg.available_beds}
                                                </strong> beds available (out of {pg.total_beds})
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                                            <Users className="w-4 h-4 shrink-0" />
                                            <span>Owned by {pg.owner_name}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-slate-800">
                                    {pg.available_beds <= 0 ? (
                                        <button disabled className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-500 font-medium cursor-not-allowed">
                                            Fully Occupied
                                        </button>
                                    ) : isActiveTenant ? (
                                        <button disabled className="w-full py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-500 font-medium cursor-not-allowed">
                                            Currently Staying in a PG
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setSelectedPg(pg)}
                                            className="btn-primary w-full"
                                        >
                                            Apply Now
                                        </button>
                                    )}
                                </div>

                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Application Modal */}
            {selectedPg && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="card w-full max-w-md animate-slide-up border-slate-700 shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-2">Apply to {selectedPg.name}</h2>

                        {!user ? (
                            <div className="space-y-4 py-4 text-center">
                                <p className="text-slate-400">You need to be logged in as a Tenant to apply for a PG.</p>
                                <div className="flex gap-3 justify-center">
                                    <Link to="/login" className="btn-secondary">Sign In</Link>
                                    <Link to="/register" className="btn-primary">Register</Link>
                                </div>
                                <button onClick={() => setSelectedPg(null)} className="text-slate-500 text-sm mt-4 hover:text-white">Cancel</button>
                            </div>
                        ) : isActiveTenant ? (
                            <div className="space-y-4 py-4 text-center">
                                <p className="text-slate-400">You are currently assigned to a PG. You cannot apply to a new one until you vacate your current one.</p>
                                <button onClick={() => setSelectedPg(null)} className="btn-secondary w-full">Go Back</button>
                            </div>
                        ) : (

                            <form onSubmit={handleApply} className="space-y-4 mt-4">
                                <div>
                                    <label className="label">Message to Owner (Optional)</label>
                                    <textarea
                                        className="input min-h-[100px] resize-y"
                                        placeholder="Hi, I am looking for a single sharing bed starting from next week..."
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        maxLength={500}
                                    />
                                    <p className="text-xs text-slate-500 mt-1">{message.length}/500</p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setSelectedPg(null)} type="button" className="btn-secondary flex-1">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={applying} className="btn-primary flex-1 flex items-center justify-center gap-2">
                                        {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                        Confirm Application
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
