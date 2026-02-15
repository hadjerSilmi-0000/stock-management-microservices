import rateLimit from "express-rate-limit";

/**
 * Generic rate limiter factory
 * @param {Object} options - Rate limiter configuration
 * @returns {Function} Express middleware
 */
export const createRateLimiter = (options = {}) => {
    return rateLimit({
        windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes default
        max: options.max || 100, // limit each IP to 100 requests per window
        message: options.message || {
            success: false,
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: "Too many requests, please try again later",
                timestamp: new Date().toISOString()
            }
        },
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        // Store in memory (for production, use Redis)
        handler: (req, res) => {
            res.status(429).json(options.message || {
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: "Too many requests, please try again later",
                    retryAfter: res.getHeader('Retry-After'),
                    timestamp: new Date().toISOString()
                }
            });
        }
    });
};

// Pre-configured rate limiters for common use cases

/**
 * Login rate limiter - strict limits to prevent brute force
 */
export const loginLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: "Too many login attempts. Please try again in 15 minutes",
            timestamp: new Date().toISOString()
        }
    },
});

/**
 * API rate limiter - general API protection
 */
export const apiLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
});

/**
 * Create operation rate limiter - protect write operations
 */
export const createOperationLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 50, // 50 create operations per 15 minutes
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: "Too many creation requests. Please slow down.",
            timestamp: new Date().toISOString()
        }
    }
});

/**
 * Password reset rate limiter
 */
export const passwordResetLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 password reset attempts per hour
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: "Too many password reset attempts. Please try again later.",
            timestamp: new Date().toISOString()
        }
    }
});