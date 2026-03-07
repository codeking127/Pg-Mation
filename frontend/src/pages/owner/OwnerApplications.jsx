import { useState, useEffect } from 'react'
import { applicationService, roomService } from '../../services/api'
import { Loader2, CheckCircle, XCircle, User, MessageSquare } from 'lucide-react'

export default function OwnerApplications() {
    const [apps, setApps] = useState([])
    const [loading, setLoading] = useState(true)
    const [reviewing, setReviewing] = useState(null)
    const [availBeds, setAvailBeds] = useState([])
    const [form, setForm] = useState({ bed_id: '', rent_amount: 5000 })
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    const loadApps = () => {
        setLoading(true)
        applicationService.getOwner().then(res => {
            setApps(res.data.applications)
        }).finally(() => setLoading(false))
    }

    useEffect(() => { loadApps() }, [])

    const handleOpenReview = async (app) => {
        setReviewing(app)
        setForm({ bed_id: '', rent_amount: 5000 })
        setError('')
        try {
            const res = await roomService.availableBeds(app.pg_id)
            setAvailBeds(res.data.beds || [])
        } catch (err) {
            console.error('Failed to load beds', err)
        }
    }

    const handleReview = async (action) => {
        if (action === 'APPROVED' && (!form.bed_id || !form.rent_amount)) {
            setError('Please assign a bed and set rent amount to approve.')
            return
        }

        setSubmitting(true)
        setError('')
        try {
            const payload = { status: action }
            if (action === 'APPROVED') {
                payload.bed_id = form.bed_id

                // Find the selected bed to extract its room_id
                const selectedBedObj = availBeds.find(b => b.id === form.bed_id)
                if (selectedBedObj) {
                    payload.room_id = selectedBedObj.room_id
                }
            }
            await applicationService.review(reviewing.id, payload)
            setReviewing(null)
            loadApps()
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to review application.')
        } finally {
            setSubmitting(false)
        }
    }

    const getStatusStyle = (status) => {
        switch (status) {
            case 'APPROVED': return 'text-emerald-400'
            case 'REJECTED': return 'text-red-400'
            default: return 'text-amber-400'
        }
    }

    return (
        <div className="space-y-6 animate-slide-up">
            <div>
                <h1 className="page-title">Tenant Applications</h1>
                <p className="text-slate-400 text-sm mt-1">Review and approve applications to your PGs</p>
            </div>

            <div className="table-container">
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>PG Property</th>
                                <th>Applicant</th>
                                <th>Message</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {apps.map((app) => (
                                <tr key={app.id} className={app.status === 'PENDING' ? 'bg-primary-500/5' : ''}>
                                    <td className="whitespace-nowrap">{new Date(app.created_at).toLocaleDateString('en-IN')}</td>
                                    <td className="font-medium text-white">{app.pg_name}</td>
                                    <td>
                                        <div className="font-medium text-white">{app.tenant_name}</div>
                                        <div className="text-xs text-slate-400 mt-0.5">{app.tenant_email}</div>
                                        {app.tenant_phone && <div className="text-xs text-slate-400">{app.tenant_phone}</div>}
                                    </td>
                                    <td>
                                        {app.message ? (
                                            <div className="max-w-xs text-sm truncate text-slate-300" title={app.message}>
                                                <MessageSquare className="w-3 h-3 inline mr-1 text-slate-500" />
                                                {app.message}
                                            </div>
                                        ) : <span className="text-slate-500 text-sm">—</span>}
                                    </td>
                                    <td className={`font-semibold ${getStatusStyle(app.status)}`}>
                                        {app.status}
                                    </td>
                                    <td>
                                        {app.status === 'PENDING' ? (
                                            <button
                                                onClick={() => handleOpenReview(app)}
                                                className="btn-primary px-3 py-1.5 text-xs rounded-lg"
                                            >
                                                Review
                                            </button>
                                        ) : (
                                            <span className="text-xs text-slate-500">
                                                Reviewed by {app.reviewed_by_name?.split(' ')[0]}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {apps.length === 0 && (
                                <tr><td colSpan={6} className="text-center text-slate-500 py-8">No applications found.</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Review Modal */}
            {reviewing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="card w-full max-w-lg shadow-2xl border-slate-700 animate-slide-up">
                        <h2 className="text-xl font-bold text-white mb-1">Review Application</h2>
                        <p className="text-slate-400 text-sm mb-6">For {reviewing.pg_name}</p>

                        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-3 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary-600/20 flex items-center justify-center">
                                    <User className="w-5 h-5 text-primary-400" />
                                </div>
                                <div>
                                    <p className="font-medium text-white">{reviewing.tenant_name}</p>
                                    <p className="text-sm text-slate-400">{reviewing.tenant_email} {reviewing.tenant_phone && `• ${reviewing.tenant_phone}`}</p>
                                </div>
                            </div>
                            {reviewing.message && (
                                <div className="mt-2 text-sm text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800">
                                    <strong className="text-slate-500 block mb-1">Message from applicant:</strong>
                                    "{reviewing.message}"
                                </div>
                            )}
                        </div>

                        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="label">Assign a verified Bed</label>
                                <select
                                    className="input"
                                    value={form.bed_id}
                                    onChange={(e) => setForm({ ...form, bed_id: e.target.value })}
                                >
                                    <option value="">Select a bed...</option>
                                    {availBeds.map(b => (
                                        <option key={b.id} value={b.id}>Room {b.room_number} • {b.bed_number} (Floor {b.floor})</option>
                                    ))}
                                </select>
                                {availBeds.length === 0 && <p className="text-xs text-red-400 mt-1">No beds available in this PG. Create rooms first.</p>}
                            </div>
                            <div>
                                <label className="label">Set Monthly Rent (₹)</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={form.rent_amount}
                                    onChange={e => setForm({ ...form, rent_amount: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setReviewing(null)}
                                disabled={submitting}
                                className="px-4 py-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
                            >
                                Cancel
                            </button>
                            <div className="flex-1 flex gap-2 justify-end">
                                <button
                                    onClick={() => handleReview('REJECTED')}
                                    disabled={submitting}
                                    className="btn-danger flex items-center gap-2"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                    Reject
                                </button>
                                <button
                                    onClick={() => handleReview('APPROVED')}
                                    disabled={submitting || !form.bed_id || availBeds.length === 0}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    Approve & Assign
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
