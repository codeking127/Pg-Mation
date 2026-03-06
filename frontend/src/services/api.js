import axios from 'axios'
import { auth } from '../firebase'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
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
}


export const pgService = {
    getAll: () => api.get('/pgs'),
    create: (data) => api.post('/pgs', data),
    update: (id, data) => api.put(`/pgs/${id}`, data),
    delete: (id) => api.delete(`/pgs/${id}`),
    stats: () => api.get('/pgs/stats/overview'),
}

export const roomService = {
    getByPg: (pgId) => api.get(`/pgs/${pgId}/rooms`),
    create: (pgId, data) => api.post(`/pgs/${pgId}/rooms`, data),
    delete: (id) => api.delete(`/rooms/${id}`),
    availableBeds: (pgId) => api.get(`/pgs/${pgId}/available-beds/available`),
}

export const tenantService = {
    getAll: () => api.get('/tenants'),
    create: (data) => api.post('/tenants', data),
    getMe: () => api.get('/tenants/me'),
    update: (id, data) => api.put(`/tenants/${id}`, data),
    delete: (id) => api.delete(`/tenants/${id}`),
    updateMyProfile: (data) => api.patch('/tenants/me/profile', data),
}


export const complaintService = {
    getAll: (params) => api.get('/complaints', { params }),
    create: (data) => api.post('/complaints', data),
    updateStatus: (id, status) => api.put(`/complaints/${id}/status`, { status }),
}

export const visitorService = {
    getAll: (params) => api.get('/visitors', { params }),
    create: (data) => api.post('/visitors', data),
    checkout: (id) => api.put(`/visitors/${id}/checkout`),
    approve: (id, approved) => api.put(`/visitors/${id}/approve`, { approved }),
}

export const rentService = {
    getAll: () => api.get('/rent'),
    getMy: () => api.get('/rent/my'),
    createInvoice: (data) => api.post('/rent/invoice', data),
    markPaid: (id) => api.put(`/rent/${id}/pay`),
}

export const applicationService = {
    getPublicPGs: () => api.get('/public/pgs/public'),
    apply: (data) => api.post('/applications', data),
    getMy: () => api.get('/applications/my'),
    getOwner: () => api.get('/applications/owner'),
    review: (id, data) => api.patch(`/applications/${id}/review`, data),
}

export const notificationService = {
    getSettings: () => api.get('/notifications/settings'),
    saveSettings: (data) => api.put('/notifications/settings', data),
    sendNow: () => api.post('/notifications/send-now'),
    getTenants: () => api.get('/notifications/tenants'),
}

