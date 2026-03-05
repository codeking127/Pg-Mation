import { useEffect, useState } from 'react'
import { pgService, userService } from '../../services/api'
import { Loader2, Plus, Trash2, Building2 } from 'lucide-react'

export default function AdminPGs() {
    const [pgs, setPgs] = useState([])
    const [owners, setOwners] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ name: '', address: '', owner_id: '' })
    const [submitting, setSubmitting] = useState(false)

    const load = () => {
        setLoading(true)
        Promise.all([
            pgService.getAll(),
            userService.getAll({ role: 'OWNER' })
        ]).then(([pgRes, userRes]) => {
            setPgs(pgRes.data.pgs)
            setOwners(userRes.data.users)
        }).finally(() => setLoading(false))
    }
    useEffect(() => { load() }, [])


    const handleCreate = async (e) => {
        e.preventDefault(); setSubmitting(true)
        try { await pgService.create(form); setShowForm(false); setForm({ name: '', address: '', owner_id: '' }); load() }
        finally { setSubmitting(false) }
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this property?')) return
        await pgService.delete(id); load()
    }

    return (
        <div className="space-y-6 animate-slide-up">
            <div className="flex items-center justify-between">
                <div><h1 className="page-title">Properties</h1><p className="text-slate-400 text-sm mt-1">{pgs.length} total</p></div>
                <button id="add-pg-btn" onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Property
                </button>
            </div>

            {showForm && (
                <div className="card animate-slide-up">
                    <h2 className="section-title mb-4">New Property</h2>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><label className="label">PG Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                        <div><label className="label">Address</label><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></div>
                        <div>
                            <label className="label">Assign Owner</label>
                            <select className="input" value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })} required>
                                <option value="" disabled>Select an Owner</option>
                                {owners.map(o => (
                                    <option key={o.id} value={o.id}>{o.name} ({o.email})</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2 md:col-span-3">

                            <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Saving...' : 'Create'}</button>
                            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-3 flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>
                ) : pgs.map((p) => (
                    <div key={p.id} className="card hover:border-slate-700 transition-colors">
                        <div className="flex justify-between items-start">
                            <div className="p-2.5 bg-primary-600/20 rounded-xl"><Building2 className="w-5 h-5 text-primary-400" /></div>
                            <button onClick={() => handleDelete(p.id)} className="btn-danger px-2 py-1 text-xs"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                        <h3 className="font-semibold text-white mt-3">{p.name}</h3>
                        <p className="text-sm text-slate-400 mt-1">{p.address}</p>
                        {p.owner_name && <p className="text-xs text-primary-400 mt-2">Owner: {p.owner_name}</p>}
                    </div>
                ))}
            </div>
        </div>
    )
}
