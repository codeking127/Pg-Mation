import { useEffect, useState } from 'react'
import { rentService, tenantService } from '../../services/api'
import { Loader2, Plus, CheckCircle } from 'lucide-react'

export default function OwnerRent() {
    const [invoices, setInvoices] = useState([])
    const [tenants, setTenants] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ tenant_id: '', amount: '', month_year: new Date().toISOString().slice(0, 7), due_date: '' })
    const [submitting, setSubmitting] = useState(false)

    const load = () => {
        setLoading(true)
        Promise.all([rentService.getAll(), tenantService.getAll()]).then(([r, t]) => {
            setInvoices(r.data.invoices)
            setTenants(t.data.tenants)
            if (t.data.tenants.length > 0 && !form.tenant_id) {
                setForm(f => ({ ...f, tenant_id: t.data.tenants[0].id, amount: String(t.data.tenants[0].rent_amount) }))
            }
        }).finally(() => setLoading(false))
    }
    useEffect(() => { load() }, [])

    const handleCreate = async (e) => {
        e.preventDefault(); setSubmitting(true)
        try {
            await rentService.createInvoice({ ...form, amount: Number(form.amount) })
            setShowForm(false); load()
        } finally { setSubmitting(false) }
    }

    const handleMarkPaid = async (id) => {
        await rentService.markPaid(id); load()
    }

    const totalUnpaid = invoices.filter((i) => !i.paid).reduce((s, i) => s + Number(i.amount), 0)

    return (
        <div className="space-y-6 animate-slide-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">Rent Management</h1>
                    <p className="text-slate-400 text-sm mt-1">₹{totalUnpaid.toLocaleString()} outstanding</p>
                </div>
                <button id="add-invoice-btn" onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" /> New Invoice
                </button>
            </div>

            {showForm && (
                <div className="card animate-slide-up">
                    <h2 className="section-title mb-4">Create Invoice</h2>
                    <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Tenant</label>
                            <select className="input" value={form.tenant_id} onChange={(e) => {
                                const t = tenants.find(x => x.id === e.target.value)
                                setForm({ ...form, tenant_id: e.target.value, amount: String(t?.rent_amount || '') })
                            }}>
                                {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div><label className="label">Month (YYYY-MM)</label><input type="month" className="input" value={form.month_year} onChange={(e) => setForm({ ...form, month_year: e.target.value })} required /></div>
                        <div><label className="label">Amount (₹)</label><input type="number" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
                        <div><label className="label">Due Date</label><input type="date" className="input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} required /></div>
                        <div className="col-span-2 flex gap-2">
                            <button type="submit" id="create-invoice-submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Creating...' : 'Create Invoice'}</button>
                            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="table-container">
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>
                ) : (
                    <table className="table">
                        <thead><tr><th>Tenant</th><th>PG</th><th>Month</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Action</th></tr></thead>
                        <tbody>
                            {invoices.map((inv) => (
                                <tr key={inv.id}>
                                    <td className="font-medium text-white">{inv.tenant_name}</td>
                                    <td>{inv.pg_name}</td>
                                    <td>{inv.month_year}</td>
                                    <td className="font-semibold text-emerald-400">₹{Number(inv.amount).toLocaleString()}</td>
                                    <td>{new Date(inv.due_date).toLocaleDateString()}</td>
                                    <td>
                                        {inv.paid
                                            ? <span className="badge-success">Paid</span>
                                            : <span className="badge-danger">Unpaid</span>}
                                    </td>
                                    <td>
                                        {!inv.paid && (
                                            <button onClick={() => handleMarkPaid(inv.id)} className="text-emerald-400 hover:text-emerald-300 p-1.5 rounded-lg hover:bg-emerald-500/10" title="Mark Paid">
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {invoices.length === 0 && (
                                <tr><td colSpan={7} className="text-center text-slate-500 py-8">No invoices yet</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
