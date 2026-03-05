import { useEffect, useState } from 'react'
import { visitorService } from '../../services/api'
import { Loader2 } from 'lucide-react'

export default function TenantVisitors() {
    const [visitors, setVisitors] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        visitorService.getAll().then((r) => setVisitors(r.data.visitors)).finally(() => setLoading(false))
    }, [])

    return (
        <div className="space-y-6 animate-slide-up">
            <div>
                <h1 className="page-title">Visitor History</h1>
                <p className="text-slate-400 text-sm mt-1">{visitors.length} visits recorded</p>
            </div>
            <div className="table-container">
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>
                ) : (
                    <table className="table">
                        <thead><tr><th>Visitor</th><th>Phone</th><th>Purpose</th><th>Check In</th><th>Check Out</th><th>Status</th></tr></thead>
                        <tbody>
                            {visitors.map((v) => (
                                <tr key={v.id}>
                                    <td className="font-medium text-white">{v.visitor_name}</td>
                                    <td>{v.phone || '—'}</td>
                                    <td>{v.purpose || '—'}</td>
                                    <td>{new Date(v.check_in).toLocaleString()}</td>
                                    <td>{v.check_out ? new Date(v.check_out).toLocaleString() : <span className="badge-warning">Active</span>}</td>
                                    <td>{v.approved ? <span className="badge-success">Approved</span> : <span className="badge-neutral">Pending</span>}</td>
                                </tr>
                            ))}
                            {visitors.length === 0 && <tr><td colSpan={6} className="text-center text-slate-500 py-8">No visitor history</td></tr>}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
