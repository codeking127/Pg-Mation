const express = require('express');
const { z } = require('zod');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

const complaintSchema = z.object({
    title: z.string().min(3),
    description: z.string().min(10),
});

const statusSchema = z.object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']),
});

// GET /api/complaints
router.get('/', async (req, res, next) => {
    try {
        let query = `
      SELECT c.*, t.id as tenant_record_id, u.name as tenant_name, p.name as pg_name
      FROM complaints c
      JOIN tenants t ON t.id = c.tenant_id
      JOIN users u ON u.id = t.user_id
      JOIN pgs p ON p.id = t.pg_id
    `;
        const params = [];

        if (req.user.role === 'TENANT') {
            const tenantResult = await pool.query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
            if (!tenantResult.rows[0]) return res.json({ complaints: [] });
            params.push(tenantResult.rows[0].id);
            query += ` WHERE c.tenant_id = $${params.length}`;
        } else if (req.user.role === 'OWNER') {
            params.push(req.user.id);
            query += ` WHERE p.owner_id = $${params.length}`;
        }

        if (req.query.status) {
            params.push(req.query.status);
            query += ` AND c.status = $${params.length}`;
        }

        query += ' ORDER BY c.created_at DESC';
        const result = await pool.query(query, params);
        res.json({ complaints: result.rows });
    } catch (err) {
        next(err);
    }
});

// POST /api/complaints (Tenant)
router.post('/', authorize('TENANT'), validate(complaintSchema), async (req, res, next) => {
    try {
        const tenantResult = await pool.query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
        if (!tenantResult.rows[0]) return res.status(400).json({ message: 'Tenant profile not found' });

        const result = await pool.query(
            `INSERT INTO complaints (tenant_id, title, description) VALUES ($1, $2, $3) RETURNING *`,
            [tenantResult.rows[0].id, req.body.title, req.body.description]
        );
        res.status(201).json({ complaint: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

// PUT /api/complaints/:id/status (Owner/Admin)
router.put('/:id/status', authorize('OWNER', 'ADMIN'), validate(statusSchema), async (req, res, next) => {
    try {
        const result = await pool.query(
            `UPDATE complaints SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [req.body.status, req.params.id]
        );
        if (!result.rows[0]) return res.status(404).json({ message: 'Complaint not found' });
        res.json({ complaint: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
