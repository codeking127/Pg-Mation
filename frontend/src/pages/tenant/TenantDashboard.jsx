import { useEffect, useRef, useState } from 'react'
import { tenantService, rentService, complaintService } from '../../services/api'
import StatCard from '../../components/StatCard'
import {
    Home, DollarSign, MessageSquare, BedDouble, Loader2,
    Camera, Pencil, Save, X, User, Phone, Shield, CreditCard,
    CheckCircle2, AlertTriangle, ZoomIn
} from 'lucide-react'

const MAX_FILE_BYTES = 2 * 1024 * 1024 // 2 MB

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        if (file.size > MAX_FILE_BYTES) {
            reject(new Error('File must be under 2 MB.'))
            return
        }
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

export default function TenantDashboard() {
    const [profile, setProfile] = useState(null)
    const [invoices, setInvoices] = useState([])
    const [complaints, setComplaints] = useState([])
    const [loading, setLoading] = useState(true)

    // Edit mode state
    const [editing, setEditing] = useState(false)
    const [form, setForm] = useState({})
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState('')
    const [saveSuccess, setSaveSuccess] = useState(false)

    // Lightbox for Aadhar preview
    const [lightbox, setLightbox] = useState(null)

    const profilePhotoRef = useRef()
    const aadharPhotoRef = useRef()

    const loadProfile = () => {
        setLoading(true)
        Promise.all([tenantService.getMe(), rentService.getMy(), complaintService.getAll()])
            .then(([p, r, c]) => {
                setProfile(p.data.tenant)
                setInvoices(r.data.invoices)
                setComplaints(c.data.complaints)
            })
            .finally(() => setLoading(false))
    }

    useEffect(() => { loadProfile() }, [])

    const startEdit = () => {
        setForm({
            name: profile?.name || '',
            phone: profile?.phone || '',
            emergency_contact: profile?.emergency_contact || '',
            aadhar_number: profile?.aadhar_number || '',
            profile_photo: profile?.profile_photo || null,
            aadhar_photo: profile?.aadhar_photo || null,
        })
        setSaveError('')
        setSaveSuccess(false)
        setEditing(true)
    }

    const cancelEdit = () => {
        setEditing(false)
        setSaveError('')
    }

    const handlePhotoUpload = async (e, field) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            const b64 = await readFileAsBase64(file)
            setForm(f => ({ ...f, [field]: b64 }))
        } catch (err) {
            setSaveError(err.message || 'Failed to read file.')
        }
        e.target.value = ''
    }

    const handleSave = async () => {
        setSaveError('')
        setSaving(true)
        try {
            const res = await tenantService.updateMyProfile(form)
            setProfile(res.data.tenant)
            setEditing(false)
            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 3000)
        } catch (err) {
            setSaveError(err.response?.data?.message || 'Failed to save profile.')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
        </div>
    )

    const unpaid = invoices.filter(i => !i.paid)
    const totalDue = unpaid.reduce((s, i) => s + Number(i.amount), 0)
    const openComplaints = complaints.filter(c => c.status !== 'RESOLVED')

    const displayPhoto = editing ? form.profile_photo : profile?.profile_photo
    const displayAadhar = editing ? form.aadhar_photo : profile?.aadhar_photo

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">My Profile</h1>
                    <p className="text-slate-400 text-sm mt-1">Welcome back, {profile?.name}</p>
                </div>
                {saveSuccess && (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-xl animate-slide-up">
                        <CheckCircle2 className="w-4 h-4" /> Profile updated!
                    </div>
                )}
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard label="My PG" value={profile?.pg_name} icon={Home} color="primary" />
                <StatCard label="Room & Bed" value={profile?.room_number ? `${profile.room_number} · ${profile.bed_number}` : '—'} icon={BedDouble} color="blue" />
                <StatCard label="Rent Due" value={`₹${totalDue.toLocaleString()}`} icon={DollarSign} color={totalDue > 0 ? 'red' : 'emerald'} />
                <StatCard label="Open Complaints" value={openComplaints.length} icon={MessageSquare} color="amber" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Profile Card ── */}
                <div className="card space-y-5 lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <h2 className="section-title">My Details</h2>
                        {!editing ? (
                            <button
                                onClick={startEdit}
                                className="flex items-center gap-1.5 text-sm text-primary-400 hover:text-primary-300 transition-colors"
                            >
                                <Pencil className="w-3.5 h-3.5" /> Edit Profile
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button onClick={cancelEdit} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                                    <X className="w-3 h-3" /> Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs"
                                >
                                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        )}
                    </div>

                    {saveError && (
                        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 px-4 py-2 rounded-xl">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {saveError}
                        </div>
                    )}

                    {/* Profile Photo */}
                    <div className="flex items-center gap-5">
                        <div className="relative flex-shrink-0">
                            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
                                {displayPhoto
                                    ? <img src={displayPhoto} alt="Profile" className="w-full h-full object-cover" />
                                    : <User className="w-8 h-8 text-slate-500" />
                                }
                            </div>
                            {editing && (
                                <button
                                    onClick={() => profilePhotoRef.current?.click()}
                                    className="absolute -bottom-2 -right-2 w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center border-2 border-slate-900 hover:bg-primary-500 transition-colors"
                                    title="Upload photo"
                                >
                                    <Camera className="w-3 h-3 text-white" />
                                </button>
                            )}
                            <input ref={profilePhotoRef} type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e, 'profile_photo')} />
                        </div>
                        <div>
                            {editing ? (
                                <>
                                    <label className="label text-xs">Full Name</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={form.name}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    />
                                </>
                            ) : (
                                <>
                                    <p className="font-semibold text-white text-lg">{profile?.name}</p>
                                    <p className="text-slate-400 text-sm">{profile?.email}</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Editable Fields Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Phone */}
                        <div>
                            <div className="flex items-center gap-1.5 mb-1">
                                <Phone className="w-3 h-3 text-slate-500" />
                                <label className="label text-xs mb-0">Phone</label>
                            </div>
                            {editing ? (
                                <input type="tel" className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 9876543210" />
                            ) : (
                                <p className="text-slate-200 text-sm">{profile?.phone || <span className="text-slate-500">Not set</span>}</p>
                            )}
                        </div>

                        {/* Emergency Contact */}
                        <div>
                            <div className="flex items-center gap-1.5 mb-1">
                                <Shield className="w-3 h-3 text-slate-500" />
                                <label className="label text-xs mb-0">Emergency Contact</label>
                            </div>
                            {editing ? (
                                <input type="tel" className="input" value={form.emergency_contact} onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))} placeholder="+91 9876543210" />
                            ) : (
                                <p className="text-slate-200 text-sm">{profile?.emergency_contact || <span className="text-slate-500">Not set</span>}</p>
                            )}
                        </div>

                        {/* Aadhar Number */}
                        <div>
                            <div className="flex items-center gap-1.5 mb-1">
                                <CreditCard className="w-3 h-3 text-slate-500" />
                                <label className="label text-xs mb-0">Aadhar Number</label>
                            </div>
                            {editing ? (
                                <input type="text" maxLength={12} className="input" value={form.aadhar_number} onChange={e => setForm(f => ({ ...f, aadhar_number: e.target.value }))} placeholder="XXXX XXXX XXXX" />
                            ) : (
                                <p className="text-slate-200 text-sm font-mono">{profile?.aadhar_number || <span className="text-slate-500 font-sans">Not set</span>}</p>
                            )}
                        </div>

                        {/* Read-only: Joining Date */}
                        <div>
                            <label className="label text-xs">Joining Date</label>
                            <p className="text-slate-200 text-sm">{profile?.joining_date ? new Date(profile.joining_date).toLocaleDateString('en-IN') : '—'}</p>
                        </div>

                        {/* Read-only: PG */}
                        <div>
                            <label className="label text-xs">PG Name</label>
                            <p className="text-slate-200 text-sm">{profile?.pg_name}</p>
                        </div>

                        {/* Read-only: Rent */}
                        <div>
                            <label className="label text-xs">Monthly Rent</label>
                            <p className="text-slate-200 text-sm font-semibold text-emerald-400">₹{Number(profile?.rent_amount).toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* ── Right column: Aadhar Card + Recent Invoices ── */}
                <div className="space-y-4">
                    {/* Aadhar Card Upload — only visible in edit mode, not displayed to tenant */}
                    {editing && (
                        <div className="card">
                            <h2 className="section-title mb-3 flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-primary-400" />
                                Aadhar Card Photo
                            </h2>
                            <p className="text-xs text-slate-500 mb-3">
                                Your Aadhar photo is only visible to your PG owner, not displayed here.
                            </p>
                            <button
                                onClick={() => aadharPhotoRef.current?.click()}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-sm"
                            >
                                <Camera className="w-4 h-4" />
                                {form.aadhar_photo ? '✓ Aadhar photo selected — click to replace' : 'Upload Aadhar Card'}
                            </button>
                            <input ref={aadharPhotoRef} type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e, 'aadhar_photo')} />
                            <p className="text-xs text-slate-600 mt-2 text-center">Max size: 2 MB · JPG, PNG, WEBP</p>
                        </div>
                    )}

                    {/* Recent Invoices */}
                    <div className="card">
                        <h2 className="section-title mb-4">Recent Invoices</h2>
                        {invoices.length === 0 ? <p className="text-slate-500 text-sm">No invoices yet.</p> : (
                            <div className="space-y-2">
                                {invoices.slice(0, 5).map(inv => (
                                    <div key={inv.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                                        <div>
                                            <p className="text-sm font-medium text-white">{inv.month_year}</p>
                                            <p className="text-xs text-slate-400">Due {new Date(inv.due_date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-emerald-400 font-semibold">₹{Number(inv.amount).toLocaleString()}</span>
                                            {inv.paid
                                                ? <span className="badge-success">Paid</span>
                                                : <span className="badge-danger">Unpaid</span>
                                            }
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Lightbox */}
            {lightbox && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
                    onClick={() => setLightbox(null)}
                >
                    <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightbox(null)}>
                        <X className="w-6 h-6" />
                    </button>
                    <img src={lightbox} alt="View" className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain" />
                </div>
            )}
        </div>
    )
}
