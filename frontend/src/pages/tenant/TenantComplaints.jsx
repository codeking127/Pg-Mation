import { useEffect, useState } from 'react'
import { complaintService } from '../../services/api'
import { Loader2, Plus } from 'lucide-react'

const statusCls = { OPEN: 'badge-danger', IN_PROGRESS: 'badge-warning', RESOLVED: 'badge-success' }

export default function TenantComplaints() {
    const [complaints, setComplaints] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ title: '', description: '' })
    const [submitting, setSubmitting] = useState(false)

    const load = () => {
        setLoading(true)
        complaintService.getAll().then((r) => setComplaints(r.data.complaints)).finally(() => setLoading(false))
    }
    useEffect(() => { load() }, [])

    const handleSubmit = async (e) => {
        e.preventDefault(); setSubmitting(true)
        try { await complaintService.create(form); setShowForm(false); setForm({ title: '', description: '' }); load() }
        finally { setSubmitting(false) }
    }

    return (
        <div className="space-y-6 animate-slide-up">
            <div className="flex items-center justify-between">
                <div><h1 className="page-title">My Complaints</h1><p className="text-slate-400 text-sm mt-1">{complaints.length} complaints</p></div>
                <button id="new-complaint-btn" onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" /> New Complaint
                </button>
            </div>

            {showForm && (
                <div className="card animate-slide-up">
                    <h2 className="section-title mb-4">Raise a Complaint</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div><label className="label">Title</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
                        <div><label className="label">Description</label><textarea rows={3} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
                        <div className="flex gap-2">
                            <button type="submit" id="submit-complaint" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Submitting...' : 'Submit'}</button>
                            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div> : (
                <div className="space-y-3">
                    {complaints.map((c) => (
                        <div key={c.id} className="card">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-semibold text-white">{c.title}</p>
                                    <p className="text-sm text-slate-400 mt-1">{c.description}</p>
                                </div>
                                <span className={statusCls[c.status]}>{c.status.replace('_', ' ')}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-3">{new Date(c.created_at).toLocaleString()}</p>
                        </div>
                    ))}
                    {complaints.length === 0 && <div className="card text-center text-slate-500 py-10">No complaints raised</div>}
                </div>
            )}
        </div>
    )
}
