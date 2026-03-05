import { useEffect, useState } from 'react'
import { complaintService } from '../../services/api'
import { Loader2, CheckCircle, Clock } from 'lucide-react'

const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED']

export default function OwnerComplaints() {
    const [complaints, setComplaints] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('')

    const load = () => {
        setLoading(true)
        complaintService.getAll(filter ? { status: filter } : {})
            .then((r) => setComplaints(r.data.complaints))
            .finally(() => setLoading(false))
    }
    useEffect(() => { load() }, [filter])

    const handleStatus = async (id, status) => {
        await complaintService.updateStatus(id, status); load()
    }

    const statusBadge = { OPEN: 'badge-danger', IN_PROGRESS: 'badge-warning', RESOLVED: 'badge-success' }

    return (
        <div className="space-y-6 animate-slide-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">Complaints</h1>
                    <p className="text-slate-400 text-sm mt-1">{complaints.length} records</p>
                </div>
                <select className="input w-44" value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <option value="">All Status</option>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            <div className="table-container">
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>
                ) : (
                    <table className="table">
                        <thead><tr><th>Title</th><th>Description</th><th>Tenant</th><th>PG</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
                        <tbody>
                            {complaints.map((c) => (
                                <tr key={c.id}>
                                    <td className="font-medium text-white">{c.title}</td>
                                    <td className="max-w-xs truncate text-slate-400" title={c.description}>{c.description}</td>
                                    <td>{c.tenant_name}</td>
                                    <td>{c.pg_name}</td>
                                    <td><span className={statusBadge[c.status]}>{c.status}</span></td>
                                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <div className="flex gap-1">
                                            {c.status !== 'IN_PROGRESS' && c.status !== 'RESOLVED' && (
                                                <button onClick={() => handleStatus(c.id, 'IN_PROGRESS')} className="text-amber-400 hover:text-amber-300 p-1.5 rounded-lg hover:bg-amber-500/10 text-xs" title="Mark In Progress">
                                                    <Clock className="w-4 h-4" />
                                                </button>
                                            )}
                                            {c.status !== 'RESOLVED' && (
                                                <button onClick={() => handleStatus(c.id, 'RESOLVED')} className="text-emerald-400 hover:text-emerald-300 p-1.5 rounded-lg hover:bg-emerald-500/10" title="Mark Resolved">
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {complaints.length === 0 && (
                                <tr><td colSpan={7} className="text-center text-slate-500 py-8">No complaints</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
