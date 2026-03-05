import { useState } from 'react'
import { FileSpreadsheet, Download, CheckCircle, Loader2, BarChart2, Users, DollarSign, MessageSquare, Eye, BedDouble } from 'lucide-react'
import api from '../../services/api'

const SHEETS = [
    { icon: BarChart2, color: 'text-violet-400', label: 'Summary Dashboard', desc: 'Occupancy rate, financial snapshot, complaint & visitor totals' },
    { icon: Users, color: 'text-emerald-400', label: 'Tenant List', desc: 'All tenants with room, bed, rent amount & joining date' },
    { icon: DollarSign, color: 'text-amber-400', label: 'Rent Invoices', desc: 'Every invoice — paid / unpaid, amounts, due dates' },
    { icon: BarChart2, color: 'text-purple-400', label: 'Monthly Analysis', desc: 'Month-wise expected vs collected vs outstanding with % collection rate' },
    { icon: MessageSquare, color: 'text-red-400', label: 'Complaints Log', desc: 'All complaints with status, tenant, and date raised' },
    { icon: Eye, color: 'text-cyan-400', label: 'Visitor Log', desc: 'Last 500 visitor entries with check-in / check-out details' },
]

export default function OwnerReports() {
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)

    const handleDownload = async () => {
        setLoading(true); setDone(false)
        try {
            const res = await api.get('/reports/owner-excel', { responseType: 'blob' })
            const url = window.URL.createObjectURL(new Blob([res.data]))
            const a = document.createElement('a')
            a.href = url
            a.download = `PG_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url)
            setDone(true)
            setTimeout(() => setDone(false), 4000)
        } catch (err) {
            alert('Failed to generate report. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">Reports & Export</h1>
                    <p className="text-slate-400 text-sm mt-1">Download a complete Excel workbook with all your PG data</p>
                </div>
                <button
                    id="download-excel-btn"
                    onClick={handleDownload}
                    disabled={loading}
                    className="btn-primary flex items-center gap-2 px-6 py-3 text-base shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 transition-all"
                >
                    {loading ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Generating…</>
                    ) : done ? (
                        <><CheckCircle className="w-5 h-5 text-emerald-300" /> Downloaded!</>
                    ) : (
                        <><Download className="w-5 h-5" /> Download Excel</>
                    )}
                </button>
            </div>

            {/* What's included */}
            <div className="card">
                <div className="flex items-center gap-2 mb-5">
                    <FileSpreadsheet className="w-5 h-5 text-primary-400" />
                    <h2 className="section-title">What's included in the report</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {SHEETS.map((s, i) => (
                        <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-colors">
                            <div className={`mt-0.5 ${s.color}`}><s.icon className="w-5 h-5" /></div>
                            <div>
                                <p className="text-sm font-semibold text-white">{s.label}</p>
                                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{s.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Usage tip */}
            <div className="card border-primary-500/30 bg-primary-500/5">
                <div className="flex gap-3">
                    <BedDouble className="w-5 h-5 text-primary-400 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-primary-300">Open on any device</p>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                            The downloaded <strong className="text-slate-300">.xlsx</strong> file opens in Microsoft Excel, Google Sheets, or Apple Numbers — on your phone, tablet, or laptop.
                            On mobile, tap the downloaded file → "Open in Sheets" or "Open in Excel".
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
