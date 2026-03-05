import { useEffect, useState } from 'react'
import { tenantService, pgService, roomService } from '../../services/api'
import { Loader2, Plus, UserMinus, User, CreditCard, X, ZoomIn, Phone, Shield } from 'lucide-react'

export default function TenantManagement() {
    const [tenants, setTenants] = useState([])
    const [pgs, setPgs] = useState([])
    const [availBeds, setAvailBeds] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [viewTenant, setViewTenant] = useState(null) // details modal
    const [lightbox, setLightbox] = useState(null)     // full-screen photo
    const [form, setForm] = useState({
        name: '', email: '', phone: '', password: 'Tenant@123',
        pg_id: '', bed_id: '', rent_amount: 5000,
        joining_date: new Date().toISOString().split('T')[0], emergency_contact: ''
    })
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    const load = () => {
        setLoading(true)
        Promise.all([tenantService.getAll(), pgService.getAll()]).then(([t, p]) => {
            setTenants(t.data.tenants)
            setPgs(p.data.pgs)
            if (p.data.pgs.length > 0 && !form.pg_id) setForm(f => ({ ...f, pg_id: p.data.pgs[0].id }))
        }).finally(() => setLoading(false))
    }
    useEffect(() => { load() }, [])

    useEffect(() => {
        if (!form.pg_id) return
        roomService.availableBeds(form.pg_id).then(r => setAvailBeds(r.data.beds || []))
    }, [form.pg_id])

    const handleCreate = async (e) => {
        e.preventDefault(); setSubmitting(true); setError('')
        try {
            const payload = {
                ...form,
                rent_amount: Number(form.rent_amount),
                bed_id: form.bed_id || undefined,
                pg_id: form.pg_id || undefined,
                phone: form.phone || undefined,
                emergency_contact: form.emergency_contact || undefined,
            }
            await tenantService.create(payload)
            setShowForm(false)
            load()
        } catch (err) {
            const data = err.response?.data
            if (data?.errors?.length) {
                setError(data.errors.map(e => `${e.field}: ${e.message}`).join(' · '))
            } else {
                setError(data?.message || 'Failed to add tenant')
            }
        } finally { setSubmitting(false) }
    }

    const handleVacate = async (id) => {
        if (!confirm('Vacate this tenant?')) return
        await tenantService.delete(id); load()
    }

    return (
        <div className="space-y-6 animate-slide-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">Tenant Management</h1>
                    <p className="text-slate-400 text-sm mt-1">{tenants.length} tenants</p>
                </div>
                <button id="add-tenant-btn" onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Tenant
                </button>
            </div>

            {showForm && (
                <div className="card animate-slide-up">
                    <h2 className="section-title mb-4">Onboard New Tenant</h2>
                    {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
                    <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label className="label">Full Name</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                        <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
                        <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                        <div><label className="label">Password <span className="text-slate-500 font-normal">(tenant login)</span></label><input className="input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Tenant@123" required /></div>
                        <div><label className="label">Emergency Contact</label><input className="input" value={form.emergency_contact} onChange={e => setForm({ ...form, emergency_contact: e.target.value })} /></div>
                        <div>
                            <label className="label">Property</label>
                            <select className="input" value={form.pg_id} onChange={e => setForm({ ...form, pg_id: e.target.value, bed_id: '' })}>
                                {pgs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Assign Bed</label>
                            <select className="input" value={form.bed_id} onChange={e => setForm({ ...form, bed_id: e.target.value })}>
                                <option value="">No bed yet</option>
                                {availBeds.map(b => (
                                    <option key={b.id} value={b.id}>Room {b.room_number} · {b.bed_number} (F{b.floor})</option>
                                ))}
                            </select>
                        </div>
                        <div><label className="label">Monthly Rent (₹)</label><input type="number" className="input" value={form.rent_amount} onChange={e => setForm({ ...form, rent_amount: e.target.value })} required /></div>
                        <div><label className="label">Joining Date</label><input type="date" className="input" value={form.joining_date} onChange={e => setForm({ ...form, joining_date: e.target.value })} /></div>
                        <div className="col-span-2 flex gap-2">
                            <button type="submit" id="create-tenant-submit" disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Add Tenant
                            </button>
                            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="table-container">
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>
                ) : (
                    <table className="table">
                        <thead><tr>
                            <th>Tenant</th>
                            <th>PG</th>
                            <th>Room</th>
                            <th>Rent</th>
                            <th>Joining</th>
                            <th>Docs</th>
                            <th>Actions</th>
                        </tr></thead>
                        <tbody>
                            {tenants.map(t => (
                                <tr key={t.id}>
                                    {/* Avatar + Name */}
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                                                {t.profile_photo
                                                    ? <img src={t.profile_photo} alt={t.name} className="w-full h-full object-cover" />
                                                    : <User className="w-4 h-4 text-slate-500" />
                                                }
                                            </div>
                                            <div>
                                                <div className="font-medium text-white">{t.name}</div>
                                                <div className="text-xs text-slate-400">{t.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{t.pg_name}</td>
                                    <td>{t.room_number ? `${t.room_number} · ${t.bed_number}` : '—'}</td>
                                    <td className="font-medium text-emerald-400">₹{t.rent_amount}</td>
                                    <td>{t.joining_date ? new Date(t.joining_date).toLocaleDateString('en-IN') : '—'}</td>
                                    {/* Docs indicator */}
                                    <td>
                                        <button
                                            onClick={() => setViewTenant(t)}
                                            className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                                        >
                                            <CreditCard className="w-3.5 h-3.5" />
                                            View Details
                                        </button>
                                    </td>
                                    <td>
                                        <button onClick={() => handleVacate(t.id)} className="btn-danger px-2 py-1 text-xs flex items-center gap-1">
                                            <UserMinus className="w-3 h-3" /> Vacate
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {tenants.length === 0 && (
                                <tr><td colSpan={7} className="text-center text-slate-500 py-8">No tenants yet</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Tenant Details Modal */}
            {viewTenant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="card w-full max-w-lg shadow-2xl border-slate-700 animate-slide-up space-y-5">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white">Tenant Details</h2>
                            <button onClick={() => setViewTenant(null)} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Profile row */}
                        <div className="flex items-center gap-4">
                            <div
                                className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 cursor-pointer"
                                onClick={() => viewTenant.profile_photo && setLightbox(viewTenant.profile_photo)}
                                title={viewTenant.profile_photo ? "Click to enlarge" : ""}
                            >
                                {viewTenant.profile_photo
                                    ? <img src={viewTenant.profile_photo} alt={viewTenant.name} className="w-full h-full object-cover" />
                                    : <User className="w-7 h-7 text-slate-500" />
                                }
                            </div>
                            <div>
                                <p className="font-semibold text-white text-lg">{viewTenant.name}</p>
                                <p className="text-slate-400 text-sm">{viewTenant.email}</p>
                                {viewTenant.profile_photo && (
                                    <button onClick={() => setLightbox(viewTenant.profile_photo)} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 mt-0.5">
                                        <ZoomIn className="w-3 h-3" /> Enlarge photo
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Info grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900 rounded-xl p-4 border border-slate-800 text-sm">
                            {[
                                ['PG', viewTenant.pg_name],
                                ['Room · Bed', viewTenant.room_number ? `${viewTenant.room_number} · ${viewTenant.bed_number}` : '—'],
                                ['Monthly Rent', `₹${Number(viewTenant.rent_amount).toLocaleString()}`],
                                ['Joining Date', viewTenant.joining_date ? new Date(viewTenant.joining_date).toLocaleDateString('en-IN') : '—'],
                                ['Phone', viewTenant.phone || '—'],
                                ['Emergency Contact', viewTenant.emergency_contact || '—'],
                                ['Aadhar Number', viewTenant.aadhar_number || '—'],
                            ].map(([k, v]) => (
                                <div key={k}>
                                    <p className="text-slate-500 text-xs">{k}</p>
                                    <p className="text-white font-medium mt-0.5">{v}</p>
                                </div>
                            ))}
                        </div>

                        {/* Aadhar Card Photo */}
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                                <CreditCard className="w-3.5 h-3.5" /> Aadhar Card
                            </p>
                            {viewTenant.aadhar_photo ? (
                                <div
                                    className="relative group rounded-xl overflow-hidden border border-slate-700 cursor-pointer"
                                    onClick={() => setLightbox(viewTenant.aadhar_photo)}
                                >
                                    <img src={viewTenant.aadhar_photo} alt="Aadhar card" className="w-full max-h-44 object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-sm">
                                        <ZoomIn className="w-4 h-4" /> Enlarge
                                    </div>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center text-slate-500 text-sm">
                                    Not uploaded yet
                                </div>
                            )}
                        </div>

                        <button onClick={() => setViewTenant(null)} className="w-full text-center text-slate-400 hover:text-white text-sm transition-colors py-1">
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Photo Lightbox */}
            {lightbox && (
                <div
                    className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
                    onClick={() => setLightbox(null)}
                >
                    <button className="absolute top-4 right-4 text-white/60 hover:text-white" onClick={() => setLightbox(null)}>
                        <X className="w-6 h-6" />
                    </button>
                    <img src={lightbox} alt="Enlarged" className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain" />
                </div>
            )}
        </div>
    )
}
