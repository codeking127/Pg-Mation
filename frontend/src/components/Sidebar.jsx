import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
    LayoutDashboard, Users, Building2, BedDouble, MessageSquare,
    UserCheck, DollarSign, Shield, LogOut, Home, FileSpreadsheet, FileCheck, Bell
} from 'lucide-react'



const NAV = {
    ADMIN: [
        { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/admin/users', label: 'Users', icon: Users },
        { to: '/admin/pgs', label: 'Properties', icon: Building2 },
    ],
    OWNER: [
        { to: '/owner', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/owner/rooms', label: 'Rooms & Beds', icon: BedDouble },
        { to: '/owner/applications', label: 'Applications', icon: FileCheck },
        { to: '/owner/tenants', label: 'Tenants', icon: Users },
        { to: '/owner/visitors', label: 'Visitors', icon: UserCheck },
        { to: '/owner/complaints', label: 'Complaints', icon: MessageSquare },
        { to: '/owner/rent', label: 'Rent', icon: DollarSign },
        { to: '/owner/notifications', label: 'Notifications', icon: Bell },
        { to: '/owner/reports', label: 'Reports & Export', icon: FileSpreadsheet },
    ],
    TENANT: [
        { to: '/tenant', label: 'My Profile', icon: Home },
        { to: '/tenant/applications', label: 'Applications', icon: FileCheck },
        { to: '/tenant/rent', label: 'Rent Status', icon: DollarSign },

        { to: '/tenant/complaints', label: 'Complaints', icon: MessageSquare },
        { to: '/tenant/visitors', label: 'Visitor History', icon: UserCheck },
    ],
    SECURITY: [
        { to: '/security', label: 'Visitor Log', icon: Shield },
    ],
}

const ROLE_COLORS = {
    ADMIN: 'from-violet-600 to-purple-700',
    OWNER: 'from-blue-600 to-cyan-700',
    TENANT: 'from-emerald-600 to-teal-700',
    SECURITY: 'from-orange-600 to-amber-700',
}

export default function Sidebar({ isOpen, setIsOpen }) {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const links = NAV[user?.role] || []
    const gradient = ROLE_COLORS[user?.role] || 'from-primary-600 to-primary-800'

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside className={`
                fixed lg:sticky top-0 left-0 z-50 h-screen
                flex flex-col w-64 bg-slate-900 border-r border-slate-800
                transition-transform duration-300 ease-in-out shrink-0
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Logo */}
                <div className={`p-6 bg-gradient-to-br ${gradient}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-white text-sm leading-none">PG-Mation</p>
                            <p className="text-white/70 text-xs mt-0.5">{user?.role}</p>
                        </div>
                    </div>
                    <div className="mt-4 p-3 bg-white/10 rounded-xl">
                        <p className="font-semibold text-white text-sm truncate">{user?.name}</p>
                        <p className="text-white/60 text-xs truncate">{user?.email}</p>
                    </div>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 p-4 space-y-1">
                    {links.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to.split('/').length === 2}
                            onClick={() => setIsOpen?.(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
               ${isActive
                                    ? 'bg-primary-600/20 text-primary-400 border border-primary-600/30'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                }`
                            }
                        >
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* Logout */}
                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium
                     text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>
        </>
    )
}
