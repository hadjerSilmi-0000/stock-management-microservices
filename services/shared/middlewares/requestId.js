import { randomUUID } from 'crypto';

/**
 * Request ID Middleware
 * Adds a unique ID to each request for tracking and debugging
 */
export const requestIdMiddleware = (req, res, next) => {
    // Use existing request ID if provided, otherwise generate new one
    req.id = req.headers['x-request-id'] || randomUUID();

    // Add to response headers for client tracking
    res.setHeader('X-Request-ID', req.id);

    next();
};