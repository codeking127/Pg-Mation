const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

const createUserSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['OWNER', 'TENANT', 'SECURITY']),
    phone: z.string().optional(),
});

const updateUserSchema = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    is_active: z.boolean().optional(),
});

// GET /api/users
router.get('/', authorize('ADMIN', 'OWNER'), async (req, res, next) => {
    try {
        const { role, search } = req.query;
        let query, params = [];

        if (req.user.role === 'OWNER') {
            // Owners see tenants in their PGs only
            params.push(req.user.id);
            query = `
                SELECT u.id, u.name, u.email, u.role, u.phone, u.is_active, u.status, u.created_at,
                       p.name AS pg_name, p.id AS pg_id
                FROM users u
                JOIN tenants t ON t.user_id = u.id
                JOIN pgs p ON p.id = t.pg_id
                WHERE p.owner_id = $${params.length}
            `;
        } else {
            // Admin sees all users, with optional PG info for tenants
            query = `
                SELECT u.id, u.name, u.email, u.role, u.phone, u.is_active, u.status, u.created_at,
                       u.profile_photo,
                       p.name AS pg_name, p.id AS pg_id,
                       r.room_number, b.bed_number
                FROM users u
                LEFT JOIN tenants t ON t.user_id = u.id
                LEFT JOIN pgs p ON p.id = t.pg_id
                LEFT JOIN beds b ON b.id = t.bed_id
                LEFT JOIN rooms r ON r.id = b.room_id
                WHERE 1=1
            `;
        }

        if (role) {
            params.push(role);
            query += ` AND ${req.user.role === 'OWNER' ? 'u.' : 'u.'}role = $${params.length}`;
        }
        if (search) {
            params.push(`%${search}%`);
            query += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
        }

        query += ' ORDER BY u.created_at DESC';
        const result = await pool.query(query, params);
        res.json({ users: result.rows });
    } catch (err) {
        next(err);
    }
});


// POST /api/users (Admin creates Owner/Security)
router.post('/', authorize('ADMIN'), validate(createUserSchema), async (req, res, next) => {
    try {
        const { name, email, password, role, phone } = req.body;
        const hash = await bcrypt.hash(password, 12);
        const result = await pool.query(
            `INSERT INTO users (name, email, password, role, phone) VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, phone, created_at`,
            [name, email, hash, role, phone || null]
        );
        res.status(201).json({ user: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

// PATCH /api/users/me/photo — any logged-in user uploads their own profile photo
router.patch('/me/photo', async (req, res, next) => {
    try {
        const { profile_photo } = req.body;
        if (!profile_photo) return res.status(400).json({ message: 'profile_photo is required' });

        const MAX_B64 = 2 * 1024 * 1024 * 1.37;
        if (profile_photo.length > MAX_B64) return res.status(400).json({ message: 'Photo must be under 2 MB.' });

        await pool.query(
            `UPDATE users SET profile_photo = $1, updated_at = NOW() WHERE id = $2`,
            [profile_photo, req.user.id]
        );
        res.json({ message: 'Profile photo updated.' });
    } catch (err) {
        next(err);
    }
});

// PATCH /api/users/me/photo/remove — remove profile photo
router.patch('/me/photo/remove', async (req, res, next) => {
    try {
        await pool.query(`UPDATE users SET profile_photo = NULL, updated_at = NOW() WHERE id = $1`, [req.user.id]);
        res.json({ message: 'Profile photo removed.' });
    } catch (err) {
        next(err);
    }
});

// GET /api/users/:id
router.get('/:id', async (req, res, next) => {
    try {
        const result = await pool.query(
            'SELECT id, name, email, role, phone, is_active, status, created_at FROM users WHERE id = $1',
            [req.params.id]
        );

        if (!result.rows[0]) return res.status(404).json({ message: 'User not found' });
        res.json({ user: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

// PUT /api/users/:id
router.put('/:id', validate(updateUserSchema), async (req, res, next) => {
    try {
        // Only admin or self
        if (req.user.role !== 'ADMIN' && req.user.id !== req.params.id) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const { name, phone, is_active } = req.body;
        const result = await pool.query(
            `UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone),
       is_active = COALESCE($3, is_active), updated_at = NOW()
       WHERE id = $4 RETURNING id, name, email, role, phone, is_active`,
            [name, phone, is_active, req.params.id]
        );
        if (!result.rows[0]) return res.status(404).json({ message: 'User not found' });
        res.json({ user: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

// PUT /api/users/:id/status
const updateStatusSchema = z.object({
    status: z.enum(['ACTIVE', 'PENDING', 'REJECTED']),
});

router.put('/:id/status', authorize('ADMIN'), validate(updateStatusSchema), async (req, res, next) => {
    try {
        const { status } = req.body;
        const result = await pool.query(
            'UPDATE users SET status = $1 WHERE id = $2 RETURNING id, name, email, role, status',
            [status, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
        res.json({ user: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

// DELETE /api/users/:id

router.delete('/:id', authorize('ADMIN'), async (req, res, next) => {
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ message: 'User deleted' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
