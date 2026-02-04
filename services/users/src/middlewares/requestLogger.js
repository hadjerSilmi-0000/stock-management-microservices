import logger from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
    const startTime = Date.now();

    // Extract request information
    const requestInfo = {
        method: req.method,
        url: req.originalUrl || req.url,
        ip: req.clientIP || req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        userId: req.user?.id || req.user?._id || 'anonymous',
        service: process.env.SERVICE_NAME || 'unknown-service',
    };

    // Log request start
    logger.info(`→ ${requestInfo.method} ${requestInfo.url}`, {
        ...requestInfo,
        type: 'request',
    });

    // Capture response
    const originalSend = res.send;
    res.send = function (data) {
        const responseTime = Date.now() - startTime;

        // Log response
        logger.info(`← ${requestInfo.method} ${requestInfo.url} ${res.statusCode} ${responseTime}ms`, {
            ...requestInfo,
            statusCode: res.statusCode,
            responseTime,
            type: 'response',
        });

        // Restore original send
        res.send = originalSend;
        return res.send(data);
    };

    next();
};

/**
 * Performance monitoring middleware
 * Tracks slow requests (>1s)
 */
export const performanceMonitor = (req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - startTime;

        // Log slow requests
        if (duration > 1000) {
            logger.warn(`Slow request detected: ${req.method} ${req.url} took ${duration}ms`, {
                method: req.method,
                url: req.url,
                duration,
                userId: req.user?.id,
                type: 'performance',
            });
        }
    });

    next();
};

/**
 * IP extraction middleware
 * Handles proxies and load balancers
 */
export const extractClientIP = (req, res, next) => {
    req.clientIP =
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.headers['x-real-ip'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress;

    next();
};