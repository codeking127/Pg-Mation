const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
    logger.error(err.message, { stack: err.stack, path: req.path });

    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Postgres unique violation
    if (err.code === '23505') {
        return res.status(409).json({ message: 'A record with this data already exists.' });
    }
    // Postgres FK violation
    if (err.code === '23503') {
        return res.status(400).json({ message: 'Referenced record does not exist.' });
    }

    res.status(status).json({
        message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
};

module.exports = { errorHandler };
