require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./config/logger');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const pgRoutes = require('./routes/pgs');
const roomRoutes = require('./routes/rooms');
const bedRoutes = require('./routes/beds');
const tenantRoutes = require('./routes/tenants');
const complaintRoutes = require('./routes/complaints');
const visitorRoutes = require('./routes/visitors');
const rentRoutes = require('./routes/rent');
const reportRoutes = require('./routes/reports');
const applicationRoutes = require('./routes/applications');
const notificationRoutes = require('./routes/notifications');



const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
app.use('/api/auth', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { message: 'Too many requests, please try again later.' },
}));
app.use('/api', rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    message: { message: 'Too many requests, please slow down.' },
}));

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Request Logger ────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.path}`, { query: req.query });
    next();
});

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pgs', pgRoutes);
// Nested room routes under pgs
app.use('/api/pgs/:pgId/rooms', roomRoutes);
// Standalone room routes (for PUT/DELETE by room id)
app.use('/api/rooms', roomRoutes);
// Nested bed routes
app.use('/api/rooms/:roomId/beds', bedRoutes);
// Available beds for a PG
app.use('/api/pgs/:pgId/available-beds', bedRoutes);
// Standalone bed update
app.use('/api/beds', bedRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/rent', rentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/applications', applicationRoutes);
// Public PG listings (no auth)
app.use('/api/public', applicationRoutes);
app.use('/api/notifications', notificationRoutes);


// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
