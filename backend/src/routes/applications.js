const express = require('express');
const { z } = require('zod');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

const router = express.Router();

// ── Public: list all PGs with availability (no auth needed) ──────────────
router.get('/pgs/public', async (req, res, next) => {
    try {
        const result = await pool.query(`
      SELECT p.*,
             u.name AS owner_name,
             COUNT(b.id) FILTER (WHERE b.status = 'AVAILABLE') AS available_beds,
             COUNT(b.id) AS total_beds
      FROM pgs p
      LEFT JOIN users u ON u.id = p.owner_id
      LEFT JOIN rooms r ON r.pg_id = p.id
      LEFT JOIN beds b ON b.room_id = r.id
      GROUP BY p.id, u.name
      ORDER BY p.name
    `);

        res.json({ pgs: result.rows });
    } catch (err) { next(err); }
});

// All routes below require auth
router.use(authenticate);

// ── Tenant: submit application ───────────────────────────────────────────
const applySchema = z.object({
    pg_id: z.string().uuid(),
    message: z.string().max(500).optional(),
});

router.post('/', authorize('TENANT'), validate(applySchema), async (req, res, next) => {
    try {
        const { pg_id, message } = req.body;

        // Check if already an active tenant somewhere
        const activeTenantCheck = await pool.query(
            'SELECT id FROM tenants WHERE user_id = $1',
            [req.user.id]
        );
        if (activeTenantCheck.rows.length > 0) {
            return res.status(403).json({ message: 'You are currently staying in a PG. Please contact your owner to be removed before applying to a new PG.' });
        }

        // Check if already applied to this specific PG and is still pending
        const existing = await pool.query(
            "SELECT id, status FROM tenant_applications WHERE user_id = $1 AND pg_id = $2 AND status = 'PENDING'",
            [req.user.id, pg_id]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ message: 'You already have a PENDING application for this PG.' });
        }

        const result = await pool.query(
            `INSERT INTO tenant_applications (user_id, pg_id, message) VALUES ($1,$2,$3) RETURNING *`,
            [req.user.id, pg_id, message || null]
        );
        res.status(201).json({ application: result.rows[0], message: 'Application submitted! The owner will review it shortly.' });
    } catch (err) { next(err); }
});

// ── Tenant: view my applications ─────────────────────────────────────────
router.get('/my', authorize('TENANT'), async (req, res, next) => {
    try {
        const result = await pool.query(`
      SELECT ta.*, p.name AS pg_name, p.address, p.city,
             u.name AS owner_name, b.bed_number, r.room_number
      FROM tenant_applications ta
      JOIN pgs p ON p.id = ta.pg_id
      JOIN users u ON u.id = p.owner_id
      LEFT JOIN beds b ON b.id = ta.bed_id
      LEFT JOIN rooms r ON r.id = b.room_id
      WHERE ta.user_id = $1
      ORDER BY ta.created_at DESC
    `, [req.user.id]);
        res.json({ applications: result.rows });
    } catch (err) { next(err); }
});

// ── Owner: view applications for their PGs ───────────────────────────────
router.get('/owner', authorize('OWNER', 'ADMIN'), async (req, res, next) => {
    try {
        const ownerId = req.user.role === 'ADMIN' ? req.query.owner_id || null : req.user.id;
        const ownerFilter = ownerId ? 'AND p.owner_id = $1' : '';
        const params = ownerId ? [ownerId] : [];
        const result = await pool.query(`
      SELECT ta.*, p.name AS pg_name,
             u.name AS tenant_name, u.email AS tenant_email, u.phone AS tenant_phone,
             reviewer.name AS reviewed_by_name
      FROM tenant_applications ta
      JOIN pgs p ON p.id = ta.pg_id
      JOIN users u ON u.id = ta.user_id
      LEFT JOIN users reviewer ON reviewer.id = ta.reviewed_by
      WHERE 1=1 ${ownerFilter}
      ORDER BY ta.status = 'PENDING' DESC, ta.created_at DESC
    `, params);
        res.json({ applications: result.rows });
    } catch (err) { next(err); }
});

// ── Owner: approve or reject ─────────────────────────────────────────────
const reviewSchema = z.object({
    action: z.enum(['APPROVED', 'REJECTED']),
    bed_id: z.string().uuid().optional(),
    rent_amount: z.number().positive().optional(),
});

router.patch('/:id/review', authorize('OWNER', 'ADMIN'), validate(reviewSchema), async (req, res, next) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { action, bed_id, rent_amount } = req.body;

        // Fetch the application
        const appRes = await client.query(
            `SELECT ta.*, p.owner_id FROM tenant_applications ta JOIN pgs p ON p.id = ta.pg_id WHERE ta.id = $1`,
            [req.params.id]
        );
        if (appRes.rows.length === 0) return res.status(404).json({ message: 'Application not found' });
        const app = appRes.rows[0];

        if (req.user.role === 'OWNER' && app.owner_id !== req.user.id) {
            return res.status(403).json({ message: 'Not your PG' });
        }

        // Update the application record
        await client.query(
            `UPDATE tenant_applications SET status=$1, bed_id=$2, rent_amount=$3, reviewed_by=$4, reviewed_at=NOW() WHERE id=$5`,
            [action, bed_id || null, rent_amount || null, req.user.id, app.id]
        );

        // If approved → create/update tenant record and mark bed occupied
        if (action === 'APPROVED') {
            // Upsert tenant record
            const tenantCheck = await client.query(
                'SELECT id FROM tenants WHERE user_id = $1', [app.user_id]
            );
            if (tenantCheck.rows.length > 0) {
                await client.query(
                    `UPDATE tenants SET pg_id=$1, bed_id=$2, rent_amount=$3, joining_date=NOW() WHERE user_id=$4`,
                    [app.pg_id, bed_id || null, rent_amount || 5000, app.user_id]
                );
            } else {
                await client.query(
                    `INSERT INTO tenants (user_id, pg_id, bed_id, rent_amount, joining_date)
           VALUES ($1,$2,$3,$4,NOW())`,
                    [app.user_id, app.pg_id, bed_id || null, rent_amount || 5000]
                );
            }
            // Mark bed occupied
            if (bed_id) {
                await client.query(`UPDATE beds SET status='OCCUPIED' WHERE id=$1`, [bed_id]);
            }
        }

        await client.query('COMMIT');
        res.json({ message: `Application ${action.toLowerCase()}` });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
});

module.exports = router;
