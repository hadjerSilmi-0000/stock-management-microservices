import rateLimit from "express-rate-limit";

export const createRateLimiter = (options = {}) => {
    return rateLimit({
        windowMs: options.windowMs || 15 * 60 * 1000,
        max: options.max || 100,
        message: options.message || { success: false, message: "Too many requests, please try again later" },
        standardHeaders: true,
        legacyHeaders: false,
    });
};

// Disabled in dev — just passes through
export const loginLimiter = (req, res, next) => next();