import { Link } from 'react-router-dom'
import { ShieldX } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Unauthorized() {
    const { user } = useAuth()
    const map = { ADMIN: '/admin', OWNER: '/owner', TENANT: '/tenant', SECURITY: '/security' }
    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center">
            <ShieldX className="w-16 h-16 text-red-500" />
            <h1 className="text-2xl font-bold text-white">Access Denied</h1>
            <p className="text-slate-400">You don't have permission to view this page.</p>
            <Link to={map[user?.role] || '/login'} className="btn-primary px-6 py-2">Go to Dashboard</Link>
        </div>
    )
}
