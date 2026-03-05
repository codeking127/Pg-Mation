import { useEffect, useState } from 'react'
import { rentService } from '../../services/api'
import { Loader2, DollarSign } from 'lucide-react'

export default function RentStatus() {
    const [invoices, setInvoices] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        rentService.getMy().then((r) => setInvoices(r.data.invoices)).finally(() => setLoading(false))
    }, [])

    const totalDue = invoices.filter((i) => !i.paid).reduce((s, i) => s + Number(i.amount), 0)

    return (
        <div className="space-y-6 animate-slide-up">
            <div className="flex items-center justify-between">
                <div><h1 className="page-title">Rent Status</h1><p className="text-slate-400 text-sm mt-1">Your payment history</p></div>
                <div className="card px-5 py-3 flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-red-400" />
                    <div>
                        <p className="text-xs text-slate-400">Total Outstanding</p>
                        <p className="font-bold text-red-400">₹{totalDue.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div> : (
                <div className="space-y-3">
                    {invoices.map((inv) => (
                        <div key={inv.id} className={`card border-l-4 ${inv.paid ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-white">{inv.month_year}</p>
                                    <p className="text-sm text-slate-400 mt-0.5">Due: {new Date(inv.due_date).toLocaleDateString()}</p>
                                    {inv.paid_at && <p className="text-xs text-emerald-400 mt-0.5">Paid on {new Date(inv.paid_at).toLocaleDateString()}</p>}
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-bold text-white">₹{Number(inv.amount).toLocaleString()}</p>
                                    {inv.paid ? <span className="badge-success">Paid</span> : <span className="badge-danger">Unpaid</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                    {invoices.length === 0 && <div className="card text-center text-slate-500 py-10">No invoices yet</div>}
                </div>
            )}
        </div>
    )
}
