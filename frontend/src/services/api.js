import axios from 'axios'

const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
})

// ── Request Interceptor: attach token from localStorage ───────────────────────
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

// ── Response Interceptor: auto-refresh on 401 TOKEN_EXPIRED ──────────────────
let isRefreshing = false
let pendingQueue = []

function processQueue(err, token = null) {
    pendingQueue.forEach(({ resolve, reject }) => (err ? reject(err) : resolve(token)))
    pendingQueue = []
}

api.interceptors.response.use(
    (res) => res,
    async (err) => {
        const original = err.config
        if (
            err.response?.status === 401 &&
            err.response?.data?.code === 'TOKEN_EXPIRED' &&
            !original._retry
        ) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    pendingQueue.push({
                        resolve: (token) => { original.headers.Authorization = `Bearer ${token}`; resolve(api(original)) },
                        reject,
                    })
                })
            }
            original._retry = true
            isRefreshing = true
            try {
                const res = await api.post('/auth/refresh')
                const { accessToken } = res.data
                localStorage.setItem('access_token', accessToken)
                api.defaults.headers.Authorization = `Bearer ${accessToken}`
                processQueue(null, accessToken)
                return api(original)
            } catch (refreshErr) {
                processQueue(refreshErr, null)
                localStorage.removeItem('access_token')
                window.location.href = '/login'
                return Promise.reject(refreshErr)
            } finally {
                isRefreshing = false
            }
        }
        return Promise.reject(err)
    }
)

export default api

// ── Resource services ─────────────────────────────────────────────────────────
export const authService = {
    login: (data) => api.post('/auth/login', data),
    logout: () => api.post('/auth/logout'),
    me: () => api.get('/auth/me'),
}

export const userService = {
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

