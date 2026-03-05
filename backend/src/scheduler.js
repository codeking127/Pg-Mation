const cron = require('node-cron');
const logger = require('./config/logger');
const { runDailyReminders } = require('./services/notifications');

/**
 * Starts the daily WhatsApp rent reminder scheduler.
 * Fires every day at 09:00 AM IST = 03:30 UTC.
 * The notification service itself filters owners by their configured day-of-month window.
 */
function startScheduler() {
    // '30 3 * * *' = 03:30 UTC = 09:00 AM IST every day
    cron.schedule('30 3 * * *', async () => {
        logger.info('⏰ [Scheduler] Triggering daily rent reminder job...');
        try {
            await runDailyReminders();
            logger.info('✅ [Scheduler] Daily rent reminder job completed.');
        } catch (err) {
            logger.error('❌ [Scheduler] Error in rent reminder job:', { error: err.message });
        }
    }, {
        timezone: 'UTC',
    });

    logger.info('📅 [Scheduler] Rent reminder scheduler started — fires daily at 09:00 AM IST (03:30 UTC)');
}

module.exports = { startScheduler };
