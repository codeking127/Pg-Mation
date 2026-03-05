const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const pool = require('../config/db');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['ADMIN', 'OWNER', 'TENANT', 'SECURITY']),
    phone: z.string().optional(),
});

function generateTokens(user) {
    const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });
    return { accessToken, refreshToken };
}

function setTokenCookies(res, accessToken, refreshToken) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
}

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1 AND is_active = true AND status = 'ACTIVE'",
            [email]
        );
        const user = result.rows[0];
        // Special check to give a better error message if they are pending
        if (!user) {
            const pendingCheck = await pool.query(
                "SELECT status FROM users WHERE email = $1 AND is_active = true",
                [email]
            );
            if (pendingCheck.rows.length > 0 && pendingCheck.rows[0].status === 'PENDING') {
                return res.status(401).json({ message: 'Your Owner account is pending Admin approval.' });
            } else if (pendingCheck.rows.length > 0 && pendingCheck.rows[0].status === 'REJECTED') {
                return res.status(401).json({ message: 'Your application to register was rejected.' });
            }
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        if (!(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }


        const { accessToken, refreshToken } = generateTokens(user);
        setTokenCookies(res, accessToken, refreshToken);

        res.json({
            user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone },
            accessToken,
        });
    } catch (err) {
        next(err);
    }
});

// POST /api/auth/register (Admin bootstrap or authorized creation)
router.post('/register', validate(registerSchema), async (req, res, next) => {
    try {
        const { name, email, password, role, phone } = req.body;

        // Owners require admin approval, Tenants are active immediately
        const initialStatus = role === 'OWNER' ? 'PENDING' : 'ACTIVE';

        const hash = await bcrypt.hash(password, 12);


        const result = await pool.query(
            `INSERT INTO users (name, email, password, role, phone, status) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, phone, status, created_at`,
            [name, email, hash, role, phone || null, initialStatus]
        );
        res.status(201).json({ user: result.rows[0], message: role === 'OWNER' ? 'Registration complete. Awaiting admin approval.' : undefined });

    } catch (err) {
        next(err);
    }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
    try {
        const token = req.cookies?.refresh_token;
        if (!token) return res.status(401).json({ message: 'Refresh token required' });

        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const result = await pool.query(
            "SELECT * FROM users WHERE id = $1 AND is_active = true AND status = 'ACTIVE'",
            [decoded.id]
        );
        const user = result.rows[0];
        if (!user) return res.status(401).json({ message: 'User not found or pending approval' });


        const { accessToken, refreshToken } = generateTokens(user);
        setTokenCookies(res, accessToken, refreshToken);
        res.json({ accessToken });
    } catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Invalid or expired refresh token' });
        }
        next(err);
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
    try {
        const result = await pool.query(
            'SELECT id, name, email, role, phone, created_at FROM users WHERE id = $1',
            [req.user.id]
        );
        res.json({ user: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
