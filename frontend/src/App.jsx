import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

import Login from './pages/Login'
import Register from './pages/Register'
import Unauthorized from './pages/Unauthorized'
import BrowsePGs from './pages/BrowsePGs'


// Admin
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminPGs from './pages/admin/AdminPGs'

// Owner
import OwnerDashboard from './pages/owner/OwnerDashboard'
import RoomManagement from './pages/owner/RoomManagement'
import TenantManagement from './pages/owner/TenantManagement'
import VisitorApproval from './pages/owner/VisitorApproval'
import OwnerComplaints from './pages/owner/OwnerComplaints'
import OwnerRent from './pages/owner/OwnerRent'
import OwnerReports from './pages/owner/OwnerReports'
import OwnerApplications from './pages/owner/OwnerApplications'
import OwnerNotifications from './pages/owner/OwnerNotifications'



// Tenant
import TenantDashboard from './pages/tenant/TenantDashboard'
import RentStatus from './pages/tenant/RentStatus'
import TenantComplaints from './pages/tenant/TenantComplaints'
import TenantVisitors from './pages/tenant/TenantVisitors'
import TenantApplications from './pages/tenant/TenantApplications'


// Security
import SecurityDashboard from './pages/security/SecurityDashboard'

const ROLE_HOME = { ADMIN: '/admin', OWNER: '/owner', TENANT: '/tenant', SECURITY: '/security' }

function RootRedirect() {
    const { user } = useAuth()
    if (!user) return <Navigate to="/login" replace />
    return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/unauthorized" element={<Unauthorized />} />
                    <Route path="/browse-pgs" element={<BrowsePGs />} />
                    <Route path="/" element={<RootRedirect />} />

                    {/* Admin */}
                    <Route element={<ProtectedRoute roles={['ADMIN']}><Layout /></ProtectedRoute>}>
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/admin/users" element={<AdminUsers />} />
                        <Route path="/admin/pgs" element={<AdminPGs />} />
                    </Route>

                    {/* Owner */}
                    <Route element={<ProtectedRoute roles={['OWNER']}><Layout /></ProtectedRoute>}>
                        <Route path="/owner" element={<OwnerDashboard />} />
                        <Route path="/owner/rooms" element={<RoomManagement />} />
                        <Route path="/owner/tenants" element={<TenantManagement />} />
                        <Route path="/owner/visitors" element={<VisitorApproval />} />
                        <Route path="/owner/complaints" element={<OwnerComplaints />} />
                        <Route path="/owner/rent" element={<OwnerRent />} />
                        <Route path="/owner/reports" element={<OwnerReports />} />
                        <Route path="/owner/applications" element={<OwnerApplications />} />
                        <Route path="/owner/notifications" element={<OwnerNotifications />} />
                    </Route>


                    {/* Tenant */}
                    <Route element={<ProtectedRoute roles={['TENANT']}><Layout /></ProtectedRoute>}>
                        <Route path="/tenant" element={<TenantDashboard />} />
                        <Route path="/tenant/rent" element={<RentStatus />} />
                        <Route path="/tenant/complaints" element={<TenantComplaints />} />
                        <Route path="/tenant/visitors" element={<TenantVisitors />} />
                        <Route path="/tenant/applications" element={<TenantApplications />} />
                    </Route>


                    {/* Security */}
                    <Route element={<ProtectedRoute roles={['SECURITY']}><Layout /></ProtectedRoute>}>
                        <Route path="/security" element={<SecurityDashboard />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    )
}
