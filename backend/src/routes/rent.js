const express = require('express');
const { z } = require('zod');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

const invoiceSchema = z.object({
    tenant_id: z.string().uuid(),
    amount: z.number().min(0),
    month_year: z.string().regex(/^\d{4}-\d{2}$/),
    due_date: z.string(),
});

// GET /api/rent — Owner/Admin sees all invoices
router.get('/', authorize('OWNER', 'ADMIN'), async (req, res, next) => {
    try {
        let query = `
      SELECT ri.*, u.name as tenant_name, p.name as pg_name
      FROM rent_invoices ri
      JOIN tenants t ON t.id = ri.tenant_id
      JOIN users u ON u.id = t.user_id
      JOIN pgs p ON p.id = t.pg_id
    `;
        const params = [];
        if (req.user.role === 'OWNER') {
            params.push(req.user.id);
            query += ` WHERE p.owner_id = $${params.length}`;
        }
        query += ' ORDER BY ri.created_at DESC';
        const result = await pool.query(query, params);
        res.json({ invoices: result.rows });
    } catch (err) {
        next(err);
    }
});

// GET /api/rent/my — Tenant's own invoices
router.get('/my', authorize('TENANT'), async (req, res, next) => {
    try {
        const tenantResult = await pool.query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
        if (!tenantResult.rows[0]) return res.json({ invoices: [] });
        const result = await pool.query(
            `SELECT ri.*, p.name as pg_name FROM rent_invoices ri
       JOIN tenants t ON t.id = ri.tenant_id
       JOIN pgs p ON p.id = t.pg_id
       WHERE ri.tenant_id = $1 ORDER BY ri.created_at DESC`,
            [tenantResult.rows[0].id]
        );
        res.json({ invoices: result.rows });
    } catch (err) {
        next(err);
    }
});

// POST /api/rent/invoice (Owner creates invoice)
router.post('/invoice', authorize('OWNER', 'ADMIN'), validate(invoiceSchema), async (req, res, next) => {
    try {
        const result = await pool.query(
            `INSERT INTO rent_invoices (tenant_id, amount, month_year, due_date) VALUES ($1, $2, $3, $4) RETURNING *`,
            [req.body.tenant_id, req.body.amount, req.body.month_year, req.body.due_date]
        );
        res.status(201).json({ invoice: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

// PUT /api/rent/:id/pay (Mark as paid)
router.put('/:id/pay', authorize('OWNER', 'ADMIN'), async (req, res, next) => {
    try {
        const result = await pool.query(
            `UPDATE rent_invoices SET paid = true, paid_at = NOW() WHERE id = $1 RETURNING *`,
            [req.params.id]
        );
        if (!result.rows[0]) return res.status(404).json({ message: 'Invoice not found' });
        res.json({ invoice: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
