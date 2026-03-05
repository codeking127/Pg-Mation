const pool = require('../config/db');
const logger = require('../config/logger');

/**
 * Send WhatsApp rent reminders to all tenants of a specific owner.
 * @param {string} ownerId - UUID of the owner user
 * @returns {{ sent: number, skipped: number, errors: string[] }}
 */
async function sendRentRemindersForOwner(ownerId) {
    const result = { sent: 0, skipped: 0, errors: [] };

    // Check Twilio config
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_FROM) {
        result.errors.push('Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM in .env');
        logger.warn('⚠️  Twilio not configured — skipping WhatsApp send');
        return result;
    }

    // Lazy-load twilio client (only if credentials are present)
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    // Fetch all active tenants for this owner who have a phone number
    const { rows: tenants } = await pool.query(`
        SELECT
            u.name        AS tenant_name,
            u.phone       AS phone,
            p.name        AS pg_name
        FROM tenants t
        JOIN users u ON u.id = t.user_id
        JOIN pgs   p ON p.id = t.pg_id
        WHERE p.owner_id = $1
          AND u.phone IS NOT NULL
          AND u.phone <> ''
          AND u.is_active = true
    `, [ownerId]);

    if (tenants.length === 0) {
        logger.info(`No tenants with phone numbers found for owner ${ownerId}`);
        return result;
    }

    // Month label e.g. "March 2026"
    const now = new Date();
    const monthLabel = now.toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

    for (const tenant of tenants) {
        // Ensure phone starts with + for WhatsApp
        let toPhone = tenant.phone.trim();
        if (!toPhone.startsWith('+')) {
            toPhone = '+' + toPhone;
        }

        const body =
            `Dear ${tenant.tenant_name},\n\n` +
            `This is a friendly reminder to please pay your rent for ${monthLabel} via Cash at your earliest convenience.\n\n` +
            `Thanks in Advance!\n— ${tenant.pg_name} Management`;

        try {
            await client.messages.create({
                from: process.env.TWILIO_WHATSAPP_FROM,
                to: `whatsapp:${toPhone}`,
                body,
            });
            result.sent++;
            logger.info(`✅ WhatsApp sent to ${tenant.tenant_name} (${toPhone})`);
        } catch (err) {
            result.skipped++;
            const errMsg = `Failed to send to ${tenant.tenant_name} (${toPhone}): ${err.message}`;
            result.errors.push(errMsg);
            logger.error('❌ ' + errMsg);
        }
    }

    return result;
}

/**
 * Called by the daily cron — iterates all owners whose reminder window includes today,
 * and sends WhatsApp reminders to their tenants.
 */
async function runDailyReminders() {
    // Get today's day-of-month in IST
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const todayDay = nowIST.getDate();

    logger.info(`🕘 Running daily rent reminders — today is day ${todayDay} of the month (IST)`);

    const { rows: owners } = await pool.query(`
        SELECT owner_id, reminder_start_day, reminder_end_day
        FROM owner_notification_settings
        WHERE enabled = true
          AND reminder_start_day <= $1
          AND reminder_end_day   >= $1
    `, [todayDay]);

    if (owners.length === 0) {
        logger.info('No owners have reminders scheduled for today.');
        return;
    }

    for (const owner of owners) {
        logger.info(`Sending reminders for owner ${owner.owner_id} (window day ${owner.reminder_start_day}–${owner.reminder_end_day})`);
        const result = await sendRentRemindersForOwner(owner.owner_id);
        logger.info(`Owner ${owner.owner_id}: sent=${result.sent}, skipped=${result.skipped}, errors=${result.errors.length}`);
    }
}

module.exports = { sendRentRemindersForOwner, runDailyReminders };
