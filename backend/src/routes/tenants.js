const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

// ── Run column migrations on startup ─────────────────────────────────────────
; (async () => {
    try {
        await pool.query(`ALTER TABLE users    ADD COLUMN IF NOT EXISTS profile_photo TEXT`);
        await pool.query(`ALTER TABLE tenants  ADD COLUMN IF NOT EXISTS aadhar_photo  TEXT`);
    } catch (err) {
        console.error('Tenant photo migration warning:', err.message);
    }
})();


const tenantSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6).optional().default('Tenant@123'),
    phone: z.string().optional(),
    pg_id: z.string().uuid(),
    bed_id: z.string().uuid().optional(),
    rent_amount: z.number().min(0),
    joining_date: z.string().optional(),
    aadhar_number: z.string().optional(),
    emergency_contact: z.string().optional(),
});

// GET /api/tenants
router.get('/', authorize('ADMIN', 'OWNER'), async (req, res, next) => {
    try {
        let query = `
      SELECT t.*, u.name, u.email, u.phone, u.is_active, u.profile_photo,
             p.name as pg_name, r.room_number, b.bed_number
      FROM tenants t
      JOIN users u ON u.id = t.user_id
      JOIN pgs p ON p.id = t.pg_id
      LEFT JOIN beds b ON b.id = t.bed_id
      LEFT JOIN rooms r ON r.id = b.room_id
    `;
        const params = [];
        if (req.user.role === 'OWNER') {
            params.push(req.user.id);
            query += ` WHERE p.owner_id = $${params.length}`;
        }
        query += ' ORDER BY t.created_at DESC';
        const result = await pool.query(query, params);
        res.json({ tenants: result.rows });
    } catch (err) {
        next(err);
    }
});

// POST /api/tenants (Owner adds tenant + creates user account)
router.post('/', authorize('OWNER', 'ADMIN'), validate(tenantSchema), async (req, res, next) => {
    try {
        const { name, email, password, phone, pg_id, bed_id, rent_amount, joining_date, aadhar_number, emergency_contact } = req.body;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const hash = await bcrypt.hash(password, 12);
            const userResult = await client.query(
                `INSERT INTO users (name, email, password, role, phone) VALUES ($1, $2, $3, 'TENANT', $4)
         RETURNING id, name, email, role, phone`,
                [name, email, hash, phone || null]
            );
            const user = userResult.rows[0];
            const tenantResult = await client.query(
                `INSERT INTO tenants (user_id, pg_id, bed_id, rent_amount, joining_date, aadhar_number, emergency_contact)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [user.id, pg_id, bed_id || null, rent_amount, joining_date || new Date().toISOString().split('T')[0], aadhar_number || null, emergency_contact || null]
            );
            // Update bed status
            if (bed_id) {
                await client.query(
                    `UPDATE beds SET status = 'OCCUPIED', tenant_id = $1 WHERE id = $2`,
                    [user.id, bed_id]
                );
            }
            await client.query('COMMIT');
            res.status(201).json({ tenant: { ...tenantResult.rows[0], ...user } });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        next(err);
    }
});

// GET /api/tenants/me (Tenant's own profile)
router.get('/me', authorize('TENANT'), async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT t.*, u.name, u.email, u.phone, u.profile_photo,
              p.name as pg_name, p.address,
              r.room_number, r.floor, b.bed_number
       FROM tenants t
       JOIN users u ON u.id = t.user_id
       JOIN pgs p ON p.id = t.pg_id
       LEFT JOIN beds b ON b.id = t.bed_id
       LEFT JOIN rooms r ON r.id = b.room_id
       WHERE t.user_id = $1`,
            [req.user.id]
        );
        if (!result.rows[0]) return res.status(404).json({ message: 'Tenant profile not found' });
        res.json({ tenant: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

// PATCH /api/tenants/me/profile — Tenant updates their own details + photos
router.patch('/me/profile', authorize('TENANT'), async (req, res, next) => {
    try {
        const { name, phone, emergency_contact, aadhar_number, profile_photo, aadhar_photo } = req.body;

        // Validate base64 size (~2MB limit)
        const MAX_B64 = 2 * 1024 * 1024 * 1.37; // base64 is ~37% larger
        if (profile_photo && profile_photo.length > MAX_B64) {
            return res.status(400).json({ message: 'Profile photo must be under 2 MB.' });
        }
        if (aadhar_photo && aadhar_photo.length > MAX_B64) {
            return res.status(400).json({ message: 'Aadhar card photo must be under 2 MB.' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Update users table — direct assignment, NULLIF converts '' to NULL
            await client.query(
                `UPDATE users SET
                    name          = $1,
                    phone         = NULLIF($2, ''),
                    profile_photo = CASE WHEN $3::TEXT IS NOT NULL THEN $3::TEXT ELSE profile_photo END,
                    updated_at    = NOW()
                 WHERE id = $4`,
                [name, phone ?? '', profile_photo ?? null, req.user.id]
            );

            // Update tenants table — direct assignment
            await client.query(
                `UPDATE tenants SET
                    emergency_contact = NULLIF($1, ''),
                    aadhar_number     = NULLIF($2, ''),
                    aadhar_photo      = CASE WHEN $3::TEXT IS NOT NULL THEN $3::TEXT ELSE aadhar_photo END,
                    updated_at        = NOW()
                 WHERE user_id = $4`,
                [emergency_contact ?? '', aadhar_number ?? '', aadhar_photo ?? null, req.user.id]
            );

            await client.query('COMMIT');

            // Return full updated profile
            const result = await client.query(
                `SELECT t.*, u.name, u.email, u.phone, u.profile_photo,
                    p.name as pg_name, p.address,
                    r.room_number, r.floor, b.bed_number
                 FROM tenants t
                 JOIN users u ON u.id = t.user_id
                 JOIN pgs p ON p.id = t.pg_id
                 LEFT JOIN beds b ON b.id = t.bed_id
                 LEFT JOIN rooms r ON r.id = b.room_id
                 WHERE t.user_id = $1`,
                [req.user.id]
            );
            res.json({ tenant: result.rows[0] });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        next(err);
    }
});


// GET /api/tenants/:id
router.get('/:id', async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT t.*, u.name, u.email, u.phone, p.name as pg_name, r.room_number, b.bed_number
       FROM tenants t
       JOIN users u ON u.id = t.user_id
       JOIN pgs p ON p.id = t.pg_id
       LEFT JOIN beds b ON b.id = t.bed_id
       LEFT JOIN rooms r ON r.id = b.room_id
       WHERE t.id = $1`,
            [req.params.id]
        );
        if (!result.rows[0]) return res.status(404).json({ message: 'Tenant not found' });
        res.json({ tenant: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

// PUT /api/tenants/:id
router.put('/:id', authorize('OWNER', 'ADMIN'), async (req, res, next) => {
    try {
        const { rent_amount, bed_id, aadhar_number, emergency_contact } = req.body;
        const result = await pool.query(
            `UPDATE tenants SET rent_amount = COALESCE($1, rent_amount),
       bed_id = COALESCE($2, bed_id), aadhar_number = COALESCE($3, aadhar_number),
       emergency_contact = COALESCE($4, emergency_contact), updated_at = NOW()
       WHERE id = $5 RETURNING *`,
            [rent_amount, bed_id, aadhar_number, emergency_contact, req.params.id]
        );
        if (!result.rows[0]) return res.status(404).json({ message: 'Tenant not found' });
        res.json({ tenant: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

// DELETE /api/tenants/:id (Vacate tenant)
router.delete('/:id', authorize('OWNER', 'ADMIN'), async (req, res, next) => {
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const tenantResult = await client.query('SELECT * FROM tenants WHERE id = $1', [req.params.id]);
            const tenant = tenantResult.rows[0];
            if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
            if (tenant.bed_id) {
                await client.query(`UPDATE beds SET status = 'AVAILABLE', tenant_id = NULL WHERE id = $1`, [tenant.bed_id]);
            }
            await client.query('DELETE FROM tenants WHERE id = $1', [req.params.id]);

            // Note: we DO NOT deactivate the user (is_active = false) here, 
            // because tenants need to be able to log back in to apply to other PGs later!

            // Also delete their application history for this specific PG so it gets cleared from the applications list
            await client.query('DELETE FROM tenant_applications WHERE user_id = $1 AND pg_id = $2', [tenant.user_id, tenant.pg_id]);

            await client.query('COMMIT');

            res.json({ message: 'Tenant vacated' });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        next(err);
    }
});

module.exports = router;
