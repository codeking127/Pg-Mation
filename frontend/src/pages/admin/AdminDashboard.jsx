import { useEffect, useState } from 'react'
import { pgService, userService } from '../../services/api'
import StatCard from '../../components/StatCard'
import { Building2, Users, BedDouble, MessageSquare, Loader2 } from 'lucide-react'

export default function AdminDashboard() {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        pgService.stats()
            .then((res) => setStats(res.data.stats))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
        </div>
    )

    const occupancy = stats ? Math.round((stats.occupied_beds / (stats.total_beds || 1)) * 100) : 0

    return (
        <div className="space-y-8 animate-slide-up">
            <div>
                <h1 className="page-title">Admin Dashboard</h1>
                <p className="text-slate-400 text-sm mt-1">System-wide overview</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <StatCard label="Total Properties" value={stats?.total_pgs} icon={Building2} color="primary" />
                <StatCard label="Owners" value={stats?.total_owners} icon={Users} color="blue" />
                <StatCard label="Tenants" value={stats?.total_tenants} icon={Users} color="emerald" />
                <StatCard label="Occupied Beds" value={stats?.occupied_beds} icon={BedDouble} color="amber" />
                <StatCard label="Occupancy Rate" value={`${occupancy}%`} icon={BedDouble} color="violet" />
                <StatCard label="Open Complaints" value={stats?.open_complaints} icon={MessageSquare} color="red" />
            </div>

            <div className="card">
                <h2 className="section-title mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <a href="/admin/users" className="flex items-center gap-3 p-4 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors">
                        <Users className="w-5 h-5 text-primary-400" />
                        <span className="text-sm font-medium">Manage Users</span>
                    </a>
                    <a href="/admin/pgs" className="flex items-center gap-3 p-4 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors">
                        <Building2 className="w-5 h-5 text-emerald-400" />
                        <span className="text-sm font-medium">Manage Properties</span>
                    </a>
                </div>
            </div>
        </div>
    )
}
