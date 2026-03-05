const express = require('express');
const { z } = require('zod');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

const router = express.Router({ mergeParams: true });
router.use(authenticate);

const roomSchema = z.object({
    room_number: z.string().min(1),
    floor: z.number().int().min(1).default(1),
    total_beds: z.number().int().min(1).max(20),
});

// GET /api/pgs/:pgId/rooms
router.get('/', async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT r.*, 
        COUNT(b.id) as total_beds,
        COUNT(b.id) FILTER (WHERE b.status = 'AVAILABLE') as available_beds
       FROM rooms r
       LEFT JOIN beds b ON b.room_id = r.id
       WHERE r.pg_id = $1
       GROUP BY r.id ORDER BY r.floor, r.room_number`,
            [req.params.pgId]
        );
        res.json({ rooms: result.rows });
    } catch (err) {
        next(err);
    }
});

// POST /api/pgs/:pgId/rooms
router.post('/', authorize('OWNER', 'ADMIN'), validate(roomSchema), async (req, res, next) => {
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const roomResult = await client.query(
                `INSERT INTO rooms (pg_id, room_number, floor, total_beds) VALUES ($1, $2, $3, $4) RETURNING *`,
                [req.params.pgId, req.body.room_number, req.body.floor, req.body.total_beds]
            );
            const room = roomResult.rows[0];
            // Auto-create beds
            for (let i = 1; i <= req.body.total_beds; i++) {
                await client.query(
                    'INSERT INTO beds (room_id, bed_number) VALUES ($1, $2)',
                    [room.id, `B${i}`]
                );
            }
            await client.query('COMMIT');
            res.status(201).json({ room });
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

// PUT /api/rooms/:id (standalone route)
router.put('/:id', authorize('OWNER', 'ADMIN'), async (req, res, next) => {
    try {
        const result = await pool.query(
            `UPDATE rooms SET room_number = COALESCE($1, room_number), floor = COALESCE($2, floor)
       WHERE id = $3 RETURNING *`,
            [req.body.room_number, req.body.floor, req.params.id]
        );
        if (!result.rows[0]) return res.status(404).json({ message: 'Room not found' });
        res.json({ room: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

// DELETE /api/rooms/:id
router.delete('/:id', authorize('OWNER', 'ADMIN'), async (req, res, next) => {
    try {
        await pool.query('DELETE FROM rooms WHERE id = $1', [req.params.id]);
        res.json({ message: 'Room deleted' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
