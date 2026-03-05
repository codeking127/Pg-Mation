require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const app = require('./app');
const pool = require('./config/db');
const logger = require('./config/logger');
const { startScheduler } = require('./scheduler');

const PORT = process.env.PORT || 5000;

async function start() {
    try {
        // Verify DB connection
        await pool.query('SELECT 1');
        logger.info('✅ Database connection established');

        app.listen(PORT, '0.0.0.0', () => {
            logger.info(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
            startScheduler();
        });
    } catch (err) {
        logger.error('❌ Failed to start server', { error: err.message });
        process.exit(1);
    }
}

start();
