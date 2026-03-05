const express = require('express');
const { z } = require('zod');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

const visitorSchema = z.object({
    tenant_id: z.string().uuid(),
    visitor_name: z.string().min(2),
    phone: z.string().optional(),
    purpose: z.string().optional(),
});

// GET /api/visitors
router.get('/', authorize('SECURITY', 'OWNER', 'ADMIN', 'TENANT'), async (req, res, next) => {
    try {
        let query = `
      SELECT v.*, u.name as tenant_name, p.name as pg_name
      FROM visitors v
      JOIN tenants t ON t.id = v.tenant_id
      JOIN users u ON u.id = t.user_id
      JOIN pgs p ON p.id = t.pg_id
    `;
        const params = [];

        if (req.user.role === 'TENANT') {
            const tenantResult = await pool.query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
            if (!tenantResult.rows[0]) return res.json({ visitors: [] });
            params.push(tenantResult.rows[0].id);
            query += ` WHERE v.tenant_id = $${params.length}`;
        } else if (req.user.role === 'OWNER') {
            params.push(req.user.id);
            query += ` WHERE p.owner_id = $${params.length}`;
        }

        // Filter active visitors
        if (req.query.active === 'true') {
            query += ` ${params.length ? 'AND' : 'WHERE'} v.check_out IS NULL`;
        }

        query += ' ORDER BY v.check_in DESC LIMIT 100';
        const result = await pool.query(query, params);
        res.json({ visitors: result.rows });
    } catch (err) {
        next(err);
    }
});

// POST /api/visitors (Security adds visitor)
router.post('/', authorize('SECURITY', 'OWNER', 'ADMIN'), validate(visitorSchema), async (req, res, next) => {
    try {
        const result = await pool.query(
            `INSERT INTO visitors (tenant_id, visitor_name, phone, purpose, added_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [req.body.tenant_id, req.body.visitor_name, req.body.phone || null, req.body.purpose || null, req.user.id]
        );
        res.status(201).json({ visitor: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

// PUT /api/visitors/:id/checkout
router.put('/:id/checkout', authorize('SECURITY', 'OWNER', 'ADMIN'), async (req, res, next) => {
    try {
        const result = await pool.query(
            `UPDATE visitors SET check_out = NOW() WHERE id = $1 AND check_out IS NULL RETURNING *`,
            [req.params.id]
        );
        if (!result.rows[0]) return res.status(404).json({ message: 'Visitor not found or already checked out' });
        res.json({ visitor: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

// PUT /api/visitors/:id/approve (Owner approves)
router.put('/:id/approve', authorize('OWNER', 'ADMIN'), async (req, res, next) => {
    try {
        const result = await pool.query(
            `UPDATE visitors SET approved = $1 WHERE id = $2 RETURNING *`,
            [req.body.approved !== false, req.params.id]
        );
        if (!result.rows[0]) return res.status(404).json({ message: 'Visitor not found' });
        res.json({ visitor: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
