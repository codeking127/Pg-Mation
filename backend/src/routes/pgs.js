const express = require('express');
const { z } = require('zod');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

const pgSchema = z.object({
    name: z.string().min(2),
    address: z.string().min(5),
    owner_id: z.string().uuid().optional(), // Required on POST, optional on PUT
});


// GET /api/pgs
router.get('/', async (req, res, next) => {
    try {
        let result;
        if (req.user.role === 'ADMIN') {
            result = await pool.query(
                `SELECT p.*, u.name as owner_name FROM pgs p
         JOIN users u ON u.id = p.owner_id ORDER BY p.created_at DESC`
            );
        } else if (req.user.role === 'OWNER') {
            result = await pool.query(
                'SELECT * FROM pgs WHERE owner_id = $1 ORDER BY created_at DESC',
                [req.user.id]
            );
        } else {
            const tenantResult = await pool.query(
                'SELECT pg_id FROM tenants WHERE user_id = $1', [req.user.id]
            );
            if (!tenantResult.rows[0]) return res.json({ pgs: [] });
            result = await pool.query('SELECT * FROM pgs WHERE id = $1', [tenantResult.rows[0].pg_id]);
        }
        res.json({ pgs: result.rows });
    } catch (err) {
        next(err);
    }
});

// POST /api/pgs
router.post('/', authorize('ADMIN'), validate(pgSchema), async (req, res, next) => {
    try {
        if (!req.body.owner_id) {
            return res.status(400).json({ message: 'owner_id is required' });
        }
        const result = await pool.query(
            `INSERT INTO pgs (name, address, owner_id) VALUES ($1, $2, $3)
       RETURNING *`,
            [req.body.name, req.body.address, req.body.owner_id]
        );
        res.status(201).json({ pg: result.rows[0] });

    } catch (err) {
        next(err);
    }
});

// GET /api/pgs/:id
router.get('/:id', async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT p.*, u.name as owner_name FROM pgs p JOIN users u ON u.id = p.owner_id WHERE p.id = $1`,
            [req.params.id]
        );
        if (!result.rows[0]) return res.status(404).json({ message: 'PG not found' });
        res.json({ pg: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

// PUT /api/pgs/:id
router.put('/:id', authorize('OWNER', 'ADMIN'), validate(pgSchema), async (req, res, next) => {
    try {
        const result = await pool.query(
            `UPDATE pgs SET name = $1, address = $2, updated_at = NOW()
       WHERE id = $3 AND ($4 = 'ADMIN' OR owner_id = $5) RETURNING *`,
            [req.body.name, req.body.address, req.params.id, req.user.role, req.user.id]
        );
        if (!result.rows[0]) return res.status(404).json({ message: 'PG not found or not authorized' });
        res.json({ pg: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

// DELETE /api/pgs/:id
router.delete('/:id', authorize('OWNER', 'ADMIN'), async (req, res, next) => {
    try {
        await pool.query(
            'DELETE FROM pgs WHERE id = $1 AND ($2 = \'ADMIN\' OR owner_id = $3)',
            [req.params.id, req.user.role, req.user.id]
        );
        res.json({ message: 'PG deleted' });
    } catch (err) {
        next(err);
    }
});

// GET /api/pgs/stats/overview (Admin dashboard stats)
router.get('/stats/overview', authorize('ADMIN'), async (req, res, next) => {
    try {
        const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM pgs) as total_pgs,
        (SELECT COUNT(*) FROM users WHERE role = 'OWNER') as total_owners,
        (SELECT COUNT(*) FROM users WHERE role = 'TENANT') as total_tenants,
        (SELECT COUNT(*) FROM beds WHERE status = 'OCCUPIED') as occupied_beds,
        (SELECT COUNT(*) FROM beds) as total_beds,
        (SELECT COUNT(*) FROM complaints WHERE status = 'OPEN') as open_complaints
    `);
        res.json({ stats: stats.rows[0] });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
