const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router({ mergeParams: true });
router.use(authenticate);

// GET /api/rooms/:roomId/beds
router.get('/', async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT b.*, u.name as tenant_name FROM beds b
       LEFT JOIN users u ON u.id = b.tenant_id
       WHERE b.room_id = $1 ORDER BY b.bed_number`,
            [req.params.roomId]
        );
        res.json({ beds: result.rows });
    } catch (err) {
        next(err);
    }
});

// GET /api/pgs/:pgId/available-beds
router.get('/available', async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT b.id, b.bed_number, r.room_number, r.floor FROM beds b
       JOIN rooms r ON r.id = b.room_id
       WHERE r.pg_id = $1 AND b.status = 'AVAILABLE'
       ORDER BY r.floor, r.room_number, b.bed_number`,
            [req.params.pgId]
        );
        res.json({ beds: result.rows });
    } catch (err) {
        next(err);
    }
});

// PUT /api/beds/:id
router.put('/:id', authorize('OWNER', 'ADMIN'), async (req, res, next) => {
    try {
        const result = await pool.query(
            `UPDATE beds SET status = COALESCE($1, status), tenant_id = $2
       WHERE id = $3 RETURNING *`,
            [req.body.status, req.body.tenant_id || null, req.params.id]
        );
        if (!result.rows[0]) return res.status(404).json({ message: 'Bed not found' });
        res.json({ bed: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
