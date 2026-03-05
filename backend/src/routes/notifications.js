const express = require('express');
const { z } = require('zod');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { sendRentRemindersForOwner } = require('../services/notifications');

const router = express.Router();
router.use(authenticate);

// ── Ensure the settings table exists (runs once at startup) ─────────────────
; (async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS owner_notification_settings (
                owner_id            UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                reminder_start_day  INT     NOT NULL DEFAULT 1  CHECK (reminder_start_day BETWEEN 1 AND 28),
                reminder_end_day    INT     NOT NULL DEFAULT 10 CHECK (reminder_end_day   BETWEEN 1 AND 28),
                enabled             BOOLEAN NOT NULL DEFAULT true,
                updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);
    } catch (err) {
        // Table may already exist — safe to ignore
        console.error('owner_notification_settings migration warning:', err.message);
    }
})();

const settingsSchema = z.object({
    reminder_start_day: z.number().int().min(1).max(28),
    reminder_end_day: z.number().int().min(1).max(28),
    enabled: z.boolean(),
}).refine(data => data.reminder_start_day <= data.reminder_end_day, {
    message: 'Start day must be less than or equal to end day',
    path: ['reminder_start_day'],
});

// GET /api/notifications/settings — get current owner's notification settings
router.get('/settings', authorize('OWNER'), async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM owner_notification_settings WHERE owner_id = $1',
            [req.user.id]
        );

        if (rows[0]) {
            return res.json({ settings: rows[0] });
        }

        // Return defaults if not yet configured
        res.json({
            settings: {
                owner_id: req.user.id,
                reminder_start_day: 1,
                reminder_end_day: 10,
                enabled: true,
            },
        });
    } catch (err) {
        next(err);
    }
});

// PUT /api/notifications/settings — save owner's notification settings
router.put('/settings', authorize('OWNER'), validate(settingsSchema), async (req, res, next) => {
    try {
        const { reminder_start_day, reminder_end_day, enabled } = req.body;

        const { rows } = await pool.query(`
            INSERT INTO owner_notification_settings (owner_id, reminder_start_day, reminder_end_day, enabled, updated_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (owner_id) DO UPDATE
                SET reminder_start_day = EXCLUDED.reminder_start_day,
                    reminder_end_day   = EXCLUDED.reminder_end_day,
                    enabled            = EXCLUDED.enabled,
                    updated_at         = NOW()
            RETURNING *
        `, [req.user.id, reminder_start_day, reminder_end_day, enabled]);

        res.json({ settings: rows[0] });
    } catch (err) {
        next(err);
    }
});

// POST /api/notifications/send-now — owner manually triggers WhatsApp reminders right now
router.post('/send-now', authorize('OWNER'), async (req, res, next) => {
    try {
        const result = await sendRentRemindersForOwner(req.user.id);
        res.json({
            message: `Reminder sent: ${result.sent} delivered, ${result.skipped} skipped.`,
            ...result,
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/notifications/tenants — list tenants who will receive reminders (for preview)
router.get('/tenants', authorize('OWNER'), async (req, res, next) => {
    try {
        const { rows } = await pool.query(`
            SELECT
                u.name    AS tenant_name,
                u.phone,
                p.name    AS pg_name,
                r.room_number,
                b.bed_number
            FROM tenants t
            JOIN users u ON u.id = t.user_id
            JOIN pgs   p ON p.id = t.pg_id
            LEFT JOIN beds  b ON b.id = t.bed_id
            LEFT JOIN rooms r ON r.id = b.room_id
            WHERE p.owner_id = $1 AND u.is_active = true
            ORDER BY p.name, u.name
        `, [req.user.id]);

        res.json({ tenants: rows });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
