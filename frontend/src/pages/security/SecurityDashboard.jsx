import { useEffect, useState } from 'react'
import { visitorService, tenantService } from '../../services/api'
import { Loader2, Plus, LogOut } from 'lucide-react'

export default function SecurityDashboard() {
    const [visitors, setVisitors] = useState([])
    const [tenants, setTenants] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ tenant_id: '', visitor_name: '', phone: '', purpose: '' })
    const [submitting, setSubmitting] = useState(false)

    const load = () => {
        setLoading(true)
        Promise.all([visitorService.getAll(), tenantService.getAll()])
            .then(([v, t]) => { setVisitors(v.data.visitors); setTenants(t.data.tenants) })
            .finally(() => setLoading(false))
    }
    useEffect(() => { load() }, [])

    const handleCreate = async (e) => {
        e.preventDefault(); setSubmitting(true)
        try { await visitorService.create(form); setShowForm(false); setForm({ tenant_id: tenants[0]?.id || '', visitor_name: '', phone: '', purpose: '' }); load() }
        finally { setSubmitting(false) }
    }

    const handleCheckout = async (id) => { await visitorService.checkout(id); load() }

    const active = visitors.filter((v) => !v.check_out)

    return (
        <div className="space-y-6 animate-slide-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">Visitor Log</h1>
                    <p className="text-slate-400 text-sm mt-1">{active.length} active visitors</p>
                </div>
                <button id="add-visitor-btn" onClick={() => { setForm(f => ({ ...f, tenant_id: tenants[0]?.id || '' })); setShowForm(!showForm) }} className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Visitor
                </button>
            </div>

            {showForm && (
                <div className="card animate-slide-up">
                    <h2 className="section-title mb-4">Register Visitor</h2>
                    <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Visiting Tenant</label>
                            <select className="input" value={form.tenant_id} onChange={(e) => setForm({ ...form, tenant_id: e.target.value })} required>
                                <option value="">Select tenant...</option>
                                {tenants.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.pg_name})</option>)}
                            </select>
                        </div>
                        <div><label className="label">Visitor Name</label><input className="input" value={form.visitor_name} onChange={(e) => setForm({ ...form, visitor_name: e.target.value })} required /></div>
                        <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                        <div><label className="label">Purpose</label><input className="input" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></div>
                        <div className="col-span-2 flex gap-2">
                            <button type="submit" id="register-visitor-submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Adding...' : 'Register Entry'}</button>
                            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div>
                <h2 className="section-title mb-3">🟢 Active Visitors</h2>
                <div className="table-container mb-6">
                    <table className="table">
                        <thead><tr><th>Visitor</th><th>Phone</th><th>Tenant</th><th>Purpose</th><th>Check In</th><th>Approved</th><th>Action</th></tr></thead>
                        <tbody>
                            {active.length === 0 && <tr><td colSpan={7} className="text-center text-slate-500 py-6">No active visitors</td></tr>}
                            {active.map((v) => (
                                <tr key={v.id}>
                                    <td className="font-medium text-white">{v.visitor_name}</td>
                                    <td>{v.phone || '—'}</td>
                                    <td>{v.tenant_name}</td>
                                    <td>{v.purpose || '—'}</td>
                                    <td>{new Date(v.check_in).toLocaleString()}</td>
                                    <td>{v.approved ? <span className="badge-success">Yes</span> : <span className="badge-warning">Pending</span>}</td>
                                    <td>
                                        <button onClick={() => handleCheckout(v.id)} className="flex items-center gap-1.5 btn-secondary px-3 py-1.5 text-xs">
                                            <LogOut className="w-3.5 h-3.5" /> Check Out
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <h2 className="section-title mb-3">Full Log</h2>
                <div className="table-container">
                    {loading ? <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div> : (
                        <table className="table">
                            <thead><tr><th>Visitor</th><th>Tenant</th><th>Check In</th><th>Check Out</th><th>Status</th></tr></thead>
                            <tbody>
                                {visitors.map((v) => (
                                    <tr key={v.id}>
                                        <td className="font-medium text-white">{v.visitor_name}</td>
                                        <td>{v.tenant_name}</td>
                                        <td>{new Date(v.check_in).toLocaleString()}</td>
                                        <td>{v.check_out ? new Date(v.check_out).toLocaleString() : '—'}</td>
                                        <td>{v.check_out ? <span className="badge-neutral">Out</span> : <span className="badge-success">In</span>}</td>
                                    </tr>
                                ))}
                                {visitors.length === 0 && <tr><td colSpan={5} className="text-center text-slate-500 py-6">No records</td></tr>}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    )
}
