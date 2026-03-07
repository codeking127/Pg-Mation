import axios from 'axios'
import { auth } from '../firebase'

let customBaseURL = import.meta.env.VITE_API_BASE_URL || '/api';
if (customBaseURL && !customBaseURL.endsWith('/api')) {
    // Gracefully handle if user sets the host in Vercel without the /api suffix
    customBaseURL = `${customBaseURL.replace(/\/$/, '')}/api`;
}

const api = axios.create({
    baseURL: customBaseURL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
})

// ── Request Interceptor: attach Firebase ID Token ───────────────────────
api.interceptors.request.use(async (config) => {
    // Check if Firebase user is logged in
    const user = auth.currentUser
    if (user) {
        // getIdToken() automatically handles refreshing the token if expired
        const token = await user.getIdToken()
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
}, (error) => {
    return Promise.reject(error)
})

// ── Response Interceptor: Basic error handling ──────────────────────────
api.interceptors.response.use(
    (res) => res,
    async (err) => {
        if (err.response?.status === 401) {
            // If API still rejects 401 after Firebase refreshed token, we force a logout
            // You can optionally call auth.signOut() here
            window.location.href = '/login'
        }
        return Promise.reject(err)
    }
)

export default api

// ── Resource services ─────────────────────────────────────────────────────────
export const authService = {
    // Login and Logout are handled by Firebase directly now in AuthContext, these are just placeholders if needed
}

export const userService = {
    me: () => api.get('/users/me'),
    getAll: (params) => api.get('/users', { params }),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    updateStatus: (id, status) => api.put(`/users/${id}/status`, { status }),
    delete: (id) => api.delete(`/users/${id}`),
    uploadPhoto: (profile_photo) => api.patch('/users/me/photo', { profile_photo }),
    removePhoto: () => api.patch('/users/me/photo/remove'),
    completeRegistration: (data) => api.post('/users/complete-registration', data),
}


export const pgService = {
    getAll: () => api.get('/pgs'),
    create: (data) => api.post('/pgs', data),
    update: (id, data) => api.put(`/pgs/${id}`, data),
    delete: (id) => api.delete(`/pgs/${id}`),
    stats: () => api.get('/pgs/stats/overview'), // Still missing in backend, will add next
}

export const roomService = {
    getByPg: (pgId) => api.get(`/rooms/${pgId}`),
    create: (pgId, data) => api.post(`/rooms`, { ...data, pg_id: pgId }),
    delete: (id) => api.delete(`/rooms/${id}`),
    availableBeds: (pgId) => api.get(`/rooms/${pgId}/available-beds`), // Will add to rooms.py
}

export const tenantService = {
    getAll: () => api.get('/tenants'),
    create: (data) => api.post('/tenants', data),
    getMe: () => api.get('/tenants/me'), // Will add to tenants.py
    update: (id, data) => api.put(`/tenants/${id}`, data),
    delete: (id) => api.delete(`/tenants/${id}`),
    updateMyProfile: (data) => api.patch('/tenants/me/profile', data), // Will add to tenants.py
}

export const complaintService = {
    getAll: (params) => api.get('/complaints', { params }),
    create: (data) => api.post('/complaints', data),
    updateStatus: (id, status) => api.patch(`/complaints/${id}/status`, { status }),
}

export const visitorService = {
    getAll: (params) => api.get('/visitors', { params }),
    create: (data) => api.post('/visitors', data),
    checkout: (id) => api.patch(`/visitors/${id}/checkout`),
    approve: (id, approved) => api.patch(`/visitors/${id}/approve`, { approved }),
}

export const rentService = {
    getAll: () => api.get('/rent/invoices'),
    getMy: () => api.get('/rent/invoices/my'), // Will add
    createInvoice: (data) => api.post('/rent/invoices', data),
    markPaid: (id) => api.patch(`/rent/invoices/${id}/pay`),
}

export const applicationService = {
    getPublicPGs: () => api.get('/pgs'), // Directed to standard pgs route which is open
    apply: (data) => api.post('/applications', data),
    getMy: () => api.get('/applications', { params: { is_tenant: true } }), // will adapt in backend
    getOwner: () => api.get('/applications', { params: { is_owner: true } }), // will adapt in backend
    review: (id, data) => api.patch(`/applications/${id}/status`, data),
}

export const notificationService = {
    getSettings: () => api.get('/notifications/settings'),
    saveSettings: (data) => api.put('/notifications/settings', data),
    sendNow: () => api.post('/notifications/send-now'),
    getTenants: () => api.get('/notifications/tenants'),
}

