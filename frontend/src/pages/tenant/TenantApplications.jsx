import { useState, useEffect } from 'react'
import { applicationService } from '../../services/api'
import { Loader2, FileText, MapPin, Calendar, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function TenantApplications() {
    const [apps, setApps] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        applicationService.getMy().then(res => {
            setApps(res.data.applications)
        }).finally(() => setLoading(false))
    }, [])

    const getStatusStyle = (status) => {
        switch (status) {
            case 'APPROVED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            case 'REJECTED': return 'bg-red-500/10 text-red-400 border-red-500/20'
            default: return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        }
    }

    return (
        <div className="space-y-6 animate-slide-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">My Applications</h1>
                    <p className="text-slate-400 text-sm mt-1">Track the status of PGs you've applied to</p>
                </div>
                <Link to="/browse-pgs" className="btn-primary">Browse Properties</Link>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary-500" /></div>
            ) : apps.length === 0 ? (
                <div className="card text-center py-20">
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-slate-500" />
                    </div>
                    <h3 className="text-lg font-medium text-white">No applications yet</h3>
                    <p className="text-slate-400 mt-2 mb-6">You haven't applied to any PG property yet.</p>
                    <Link to="/browse-pgs" className="btn-primary inline-flex">Find a PG</Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {apps.map(app => (
                        <div key={app.id} className="card flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-3 flex-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-bold text-white">{app.pg_name}</h3>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(app.status)}`}>
                                        {app.status}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                                        <MapPin className="w-4 h-4 shrink-0" />
                                        <span className="truncate">{app.address}, {app.city}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                                        <Calendar className="w-4 h-4 shrink-0" />
                                        <span>Applied on {new Date(app.created_at).toLocaleDateString('en-IN')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                                        <Clock className="w-4 h-4 shrink-0" />
                                        <span>Response: {app.reviewed_at ? new Date(app.reviewed_at).toLocaleDateString() : 'Pending'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                                        <span className="font-medium text-slate-300">Owner:</span> {app.owner_name}
                                    </div>
                                </div>
                                {app.message && (
                                    <div className="mt-4 p-3 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-300">
                                        <span className="text-slate-500 font-medium block mb-1">Your Message:</span>
                                        {app.message}
                                    </div>
                                )}
                            </div>

                            {/* Approved Details */}
                            {app.status === 'APPROVED' && app.bed_number && (
                                <div className="p-4 rounded-xl bg-primary-500/10 border border-primary-500/20 md:w-64 shrink-0">
                                    <h4 className="font-semibold text-primary-300 mb-2">Assignment Details</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-primary-400/70">Room</span>
                                            <span className="text-white font-medium">{app.room_number || 'TBD'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-primary-400/70">Bed</span>
                                            <span className="text-white font-medium">{app.bed_number || 'TBD'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-primary-400/70">Rent</span>
                                            <span className="text-emerald-400 font-bold">₹{app.rent_amount || 'TBD'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
