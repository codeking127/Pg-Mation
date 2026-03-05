import { useEffect, useRef, useState } from 'react'
import { pgService, tenantService, complaintService, userService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import StatCard from '../../components/StatCard'
import { Building2, BedDouble, Users, MessageSquare, Loader2, Camera, User, X, CheckCircle2, AlertTriangle } from 'lucide-react'

const MAX_FILE_BYTES = 2 * 1024 * 1024

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        if (file.size > MAX_FILE_BYTES) { reject(new Error('File must be under 2 MB.')); return }
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

export default function OwnerDashboard() {
    const { user } = useAuth()
    const [pgs, setPgs] = useState([])
    const [tenants, setTenants] = useState([])
    const [complaints, setComplaints] = useState([])
    const [loading, setLoading] = useState(true)
    const [photo, setPhoto] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [photoMsg, setPhotoMsg] = useState(null) // { type: 'success'|'error', text }
    const photoRef = useRef()

    useEffect(() => {
        Promise.all([
            pgService.getAll(),
            tenantService.getAll(),
            complaintService.getAll({ status: 'OPEN' }),
        ]).then(([p, t, c]) => {
            setPgs(p.data.pgs)
            setTenants(t.data.tenants)
            setComplaints(c.data.complaints)
        }).finally(() => setLoading(false))
    }, [])

    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setPhotoMsg(null)
        setUploading(true)
        try {
            const b64 = await readFileAsBase64(file)
            await userService.uploadPhoto(b64)
            setPhoto(b64)
            setPhotoMsg({ type: 'success', text: 'Profile photo updated!' })
            setTimeout(() => setPhotoMsg(null), 3000)
        } catch (err) {
            setPhotoMsg({ type: 'error', text: err.message || 'Failed to upload photo.' })
        } finally {
            setUploading(false)
            e.target.value = ''
        }
    }

    const handleRemovePhoto = async () => {
        setUploading(true)
        try {
            await userService.removePhoto()
            setPhoto(null)
            setPhotoMsg({ type: 'success', text: 'Photo removed.' })
            setTimeout(() => setPhotoMsg(null), 3000)
        } catch {
            setPhotoMsg({ type: 'error', text: 'Failed to remove photo.' })
        } finally { setUploading(false) }
    }

    if (loading) return (
        <div className="flex items-center justify-center h-64 mt-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
        </div>
    )

    const myPg = pgs[0]

    return (
        <div className="space-y-8 animate-slide-up">
            <div className="flex items-start gap-5">
                {/* Profile photo */}
                <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
                        {photo
                            ? <img src={photo} alt="Profile" className="w-full h-full object-cover" />
                            : <User className="w-7 h-7 text-slate-500" />
                        }
                    </div>
                    <button
                        onClick={() => photoRef.current?.click()}
                        disabled={uploading}
                        className="absolute -bottom-2 -right-2 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center border-2 border-slate-900 hover:bg-blue-500 transition-colors"
                        title="Upload profile photo (visible only to Admin)"
                    >
                        {uploading ? <Loader2 className="w-3 h-3 text-white animate-spin" /> : <Camera className="w-3 h-3 text-white" />}
                    </button>
                    <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </div>

                <div className="flex-1">
                    <h1 className="page-title">Owner Dashboard</h1>
                    <p className="text-slate-400 text-sm mt-0.5">{myPg ? myPg.name : 'No property yet'}</p>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-slate-500">
                            {photo ? '✅ Profile photo uploaded' : '📷 Add a profile photo'} — only visible to Admin
                        </p>
                        {photo && (
                            <button onClick={handleRemovePhoto} className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-0.5 transition-colors">
                                <X className="w-3 h-3" /> Remove
                            </button>
                        )}
                    </div>
                    {photoMsg && (
                        <div className={`mt-2 flex items-center gap-1.5 text-xs ${photoMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {photoMsg.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                            {photoMsg.text}
                        </div>
                    )}
                </div>
            </div>

            {pgs.length === 0 && (
                <div className="card border-amber-500/30 bg-amber-500/5">
                    <p className="text-amber-400 font-medium">You have not been assigned a PG property yet.</p>
                    <p className="text-amber-400/80 text-sm mt-1">Please contact the Administrator to assign a property to your account.</p>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard label="Properties" value={pgs.length} icon={Building2} color="primary" />
                <StatCard label="Tenants" value={tenants.length} icon={Users} color="emerald" />
                <StatCard label="Open Complaints" value={complaints.length} icon={MessageSquare} color="red" />
                <StatCard label="Occupancy" value={`${tenants.length} beds`} icon={BedDouble} color="amber" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                    <h2 className="section-title mb-4">Recent Tenants</h2>
                    {tenants.length === 0 ? (
                        <p className="text-slate-500 text-sm">No tenants yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {tenants.slice(0, 5).map(t => (
                                <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                                    <div>
                                        <p className="text-sm font-medium text-white">{t.name}</p>
                                        <p className="text-xs text-slate-400">{t.room_number ? `Room ${t.room_number}` : 'No room'} · ₹{t.rent_amount}/mo</p>
                                    </div>
                                    <span className="badge-success">Active</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="card">
                    <h2 className="section-title mb-4">Open Complaints</h2>
                    {complaints.length === 0 ? (
                        <p className="text-slate-500 text-sm">No open complaints 🎉</p>
                    ) : (
                        <div className="space-y-2">
                            {complaints.slice(0, 5).map(c => (
                                <div key={c.id} className="py-2 border-b border-slate-800 last:border-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-white">{c.title}</p>
                                        <span className="badge-warning">{c.status}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">{c.tenant_name}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
