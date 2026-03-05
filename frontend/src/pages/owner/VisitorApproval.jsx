import { useEffect, useState } from 'react'
import { visitorService } from '../../services/api'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function VisitorApproval() {
    const [visitors, setVisitors] = useState([])
    const [loading, setLoading] = useState(true)

    const load = () => {
        setLoading(true)
        visitorService.getAll().then((r) => setVisitors(r.data.visitors)).finally(() => setLoading(false))
    }
    useEffect(() => { load() }, [])

    const handleApprove = async (id, approved) => {
        await visitorService.approve(id, approved); load()
    }
    const handleCheckout = async (id) => {
        await visitorService.checkout(id); load()
    }

    return (
        <div className="space-y-6 animate-slide-up">
            <div>
                <h1 className="page-title">Visitor Management</h1>
                <p className="text-slate-400 text-sm mt-1">Approve / reject visitor requests</p>
            </div>
            <div className="table-container">
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>
                ) : (
                    <table className="table">
                        <thead><tr><th>Visitor</th><th>Phone</th><th>Tenant</th><th>Purpose</th><th>Check-In</th><th>Check-Out</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            {visitors.map((v) => (
                                <tr key={v.id}>
                                    <td className="font-medium text-white">{v.visitor_name}</td>
                                    <td>{v.phone || '—'}</td>
                                    <td>{v.tenant_name}</td>
                                    <td>{v.purpose || '—'}</td>
                                    <td>{new Date(v.check_in).toLocaleString()}</td>
                                    <td>{v.check_out ? new Date(v.check_out).toLocaleString() : <span className="badge-warning">Active</span>}</td>
                                    <td>
                                        {v.approved ? <span className="badge-success">Approved</span> : <span className="badge-warning">Pending</span>}
                                    </td>
                                    <td>
                                        <div className="flex gap-1">
                                            {!v.approved && (
                                                <>
                                                    <button onClick={() => handleApprove(v.id, true)} className="text-emerald-400 hover:text-emerald-300 p-1.5 rounded-lg hover:bg-emerald-500/10" title="Approve"><CheckCircle className="w-4 h-4" /></button>
                                                    <button onClick={() => handleApprove(v.id, false)} className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10" title="Reject"><XCircle className="w-4 h-4" /></button>
                                                </>
                                            )}
                                            {!v.check_out && (
                                                <button onClick={() => handleCheckout(v.id)} className="btn-secondary px-2 py-1 text-xs">Check Out</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {visitors.length === 0 && (
                                <tr><td colSpan={8} className="text-center text-slate-500 py-8">No visitor records</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
