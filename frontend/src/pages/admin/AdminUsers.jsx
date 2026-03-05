import { useEffect, useState } from 'react'
import { userService } from '../../services/api'
import { Loader2, Plus, Trash2, UserCheck, UserX, Building2, BedDouble, User } from 'lucide-react'

const FORM_ROLES = ['OWNER', 'SECURITY']
const TABS = ['ALL', 'ADMIN', 'OWNER', 'TENANT', 'SECURITY']

export default function AdminUsers() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('ALL')
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ name: '', email: '', password: 'Owner@123', role: 'OWNER', phone: '' })
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    const load = () => {
        setLoading(true)
        userService.getAll().then((r) => setUsers(r.data.users)).finally(() => setLoading(false))
    }
    useEffect(() => { load() }, [])

    const handleCreate = async (e) => {
        e.preventDefault()
        setSubmitting(true); setError('')
        try {
            await userService.create(form)
            setShowForm(false)
            setForm({ name: '', email: '', password: 'Owner@123', role: 'OWNER', phone: '' })
            load()
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create user')
        } finally { setSubmitting(false) }
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this user?')) return
        await userService.delete(id)
        load()
    }

    const handleUpdateStatus = async (id, status) => {
        try {
            await userService.updateStatus(id, status)
            load()
        } catch (err) {
            alert('Failed to update status')
        }
    }

    const roleBadge = (role) => ({
        ADMIN: 'badge-info', OWNER: 'badge-success', TENANT: 'badge-warning', SECURITY: 'badge-neutral'
    }[role] || 'badge-neutral')

    // Filter users by active tab
    const filtered = activeTab === 'ALL' ? users : users.filter(u => u.role === activeTab)

    // Tab counts
    const counts = TABS.reduce((acc, t) => {
        acc[t] = t === 'ALL' ? users.length : users.filter(u => u.role === t).length
        return acc
    }, {})

    // Separate tenant sub-filters
    const tenantInPg = filtered.filter(u => u.role === 'TENANT' && u.pg_name)
    const tenantNoPg = filtered.filter(u => u.role === 'TENANT' && !u.pg_name)

    return (
        <div className="space-y-6 animate-slide-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">User Management</h1>
                    <p className="text-slate-400 text-sm mt-1">{users.length} users total</p>
                </div>
                <button id="add-user-btn" onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add User
                </button>
            </div>

            {/* Role Tabs */}
            <div className="flex flex-wrap gap-2">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border ${activeTab === tab
                            ? 'bg-primary-600 border-primary-500 text-white'
                            : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                            }`}
                    >
                        {tab} <span className="ml-1.5 text-xs opacity-70">({counts[tab]})</span>
                    </button>
                ))}
            </div>

            {showForm && (
                <div className="card animate-slide-up">
                    <h2 className="section-title mb-4">Create New User</h2>
                    {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
                    <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label className="label">Full Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                        <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
                        <div><label className="label">Password</label><input className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
                        <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                        <div>
                            <label className="label">Role</label>
                            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                                {FORM_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div className="flex items-end gap-2">
                            <button type="submit" disabled={submitting} id="create-user-submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Create
                            </button>
                            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Tenant sub-sections */}
            {activeTab === 'TENANT' ? (
                <div className="space-y-6">
                    {/* Tenants IN a PG */}
                    <div>
                        <h2 className="section-title mb-3 flex items-center gap-2 text-emerald-400">
                            <Building2 className="w-4 h-4" /> Currently in a PG ({tenantInPg.length})
                        </h2>
                        <div className="table-container">
                            {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div> : (
                                <table className="table">
                                    <thead><tr><th>Name</th><th>Email</th><th>PG</th><th>Room · Bed</th><th>Status</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        {tenantInPg.map((u) => (
                                            <tr key={u.id}>
                                                <td className="font-medium text-white">{u.name}</td>
                                                <td>{u.email}</td>
                                                <td>
                                                    <span className="flex items-center gap-1 text-primary-400 font-medium">
                                                        <Building2 className="w-3.5 h-3.5" /> {u.pg_name}
                                                    </span>
                                                </td>
                                                <td>
                                                    {u.room_number ? (
                                                        <span className="flex items-center gap-1 text-slate-300">
                                                            <BedDouble className="w-3.5 h-3.5 text-slate-500" /> {u.room_number} · {u.bed_number}
                                                        </span>
                                                    ) : <span className="text-slate-500">—</span>}
                                                </td>
                                                <td>
                                                    {u.status === 'ACTIVE' && <span className="badge-success"><UserCheck className="w-3 h-3" />Active</span>}
                                                    {u.status === 'PENDING' && <span className="badge-warning">Pending</span>}
                                                    {u.status === 'REJECTED' && <span className="badge-danger"><UserX className="w-3 h-3" />Rejected</span>}
                                                </td>
                                                <td>
                                                    <div className="flex gap-2">
                                                        {u.status === 'PENDING' && (
                                                            <>
                                                                <button onClick={() => handleUpdateStatus(u.id, 'ACTIVE')} className="btn-success px-2 py-1 text-xs">Approve</button>
                                                                <button onClick={() => handleUpdateStatus(u.id, 'REJECTED')} className="btn-danger px-2 py-1 text-xs">Reject</button>
                                                            </>
                                                        )}
                                                        {u.status === 'REJECTED' && <button onClick={() => handleUpdateStatus(u.id, 'ACTIVE')} className="btn-success px-2 py-1 text-xs">Approve</button>}
                                                        <button onClick={() => handleDelete(u.id)} className="btn-danger px-2 py-1 text-xs" title="Delete User"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {tenantInPg.length === 0 && <tr><td colSpan={6} className="text-center text-slate-500 py-8">No tenants currently in a PG.</td></tr>}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Tenants NOT in a PG */}
                    <div>
                        <h2 className="section-title mb-3 flex items-center gap-2 text-amber-400">
                            <UserX className="w-4 h-4" /> Not Assigned to any PG ({tenantNoPg.length})
                        </h2>
                        <div className="table-container">
                            {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div> : (
                                <table className="table">
                                    <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        {tenantNoPg.map((u) => (
                                            <tr key={u.id}>
                                                <td className="font-medium text-white">{u.name}</td>
                                                <td>{u.email}</td>
                                                <td>{u.phone || '—'}</td>
                                                <td>
                                                    {u.status === 'ACTIVE' && <span className="badge-success"><UserCheck className="w-3 h-3" />Active</span>}
                                                    {u.status === 'PENDING' && <span className="badge-warning">Pending</span>}
                                                    {u.status === 'REJECTED' && <span className="badge-danger"><UserX className="w-3 h-3" />Rejected</span>}
                                                </td>
                                                <td>
                                                    <div className="flex gap-2">
                                                        {u.status === 'PENDING' && (
                                                            <>
                                                                <button onClick={() => handleUpdateStatus(u.id, 'ACTIVE')} className="btn-success px-2 py-1 text-xs">Approve</button>
                                                                <button onClick={() => handleUpdateStatus(u.id, 'REJECTED')} className="btn-danger px-2 py-1 text-xs">Reject</button>
                                                            </>
                                                        )}
                                                        {u.status === 'REJECTED' && <button onClick={() => handleUpdateStatus(u.id, 'ACTIVE')} className="btn-success px-2 py-1 text-xs">Approve</button>}
                                                        <button onClick={() => handleDelete(u.id)} className="btn-danger px-2 py-1 text-xs" title="Delete User"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {tenantNoPg.length === 0 && <tr><td colSpan={5} className="text-center text-slate-500 py-8">All tenants are assigned to a PG.</td></tr>}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* Regular table for non-Tenant tabs */
                <div className="table-container">
                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>
                    ) : (
                        <table className="table">
                            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody>
                                {filtered.map((u) => (
                                    <tr key={u.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                                                    {u.profile_photo ? (
                                                        <img src={u.profile_photo} alt={u.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="w-4 h-4 text-slate-500" />
                                                    )}
                                                </div>
                                                <div className="font-medium text-white">{u.name}</div>
                                            </div>
                                        </td>
                                        <td>{u.email}</td>
                                        <td><span className={roleBadge(u.role)}>{u.role}</span></td>
                                        <td>{u.phone || '—'}</td>
                                        <td>
                                            {u.status === 'ACTIVE' && <span className="badge-success"><UserCheck className="w-3 h-3" />Active</span>}
                                            {u.status === 'PENDING' && <span className="badge-warning">Pending</span>}
                                            {u.status === 'REJECTED' && <span className="badge-danger"><UserX className="w-3 h-3" />Rejected</span>}
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
                                                {u.status === 'PENDING' && (
                                                    <>
                                                        <button onClick={() => handleUpdateStatus(u.id, 'ACTIVE')} className="btn-success px-2 py-1 text-xs">Approve</button>
                                                        <button onClick={() => handleUpdateStatus(u.id, 'REJECTED')} className="btn-danger px-2 py-1 text-xs">Reject</button>
                                                    </>
                                                )}
                                                {u.status === 'REJECTED' && (
                                                    <button onClick={() => handleUpdateStatus(u.id, 'ACTIVE')} className="btn-success px-2 py-1 text-xs">Approve</button>
                                                )}
                                                <button onClick={() => handleDelete(u.id)} className="btn-danger px-2 py-1 text-xs" title="Delete User">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr><td colSpan={6} className="text-center text-slate-500 py-8">No {activeTab === 'ALL' ? '' : activeTab} users found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    )
}
