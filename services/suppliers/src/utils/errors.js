export const ERROR_CODES = {
    // Authentication & Authorization
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    INVALID_TOKEN: 'INVALID_TOKEN',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',

    // User errors
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',

    // Product errors
    PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
    PRODUCT_ALREADY_EXISTS: 'PRODUCT_ALREADY_EXISTS',
    INVALID_SKU: 'INVALID_SKU',

    // Stock errors
    INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
    INVALID_QUANTITY: 'INVALID_QUANTITY',
    STOCK_NOT_FOUND: 'STOCK_NOT_FOUND',

    // Supplier errors
    SUPPLIER_NOT_FOUND: 'SUPPLIER_NOT_FOUND',
    SUPPLIER_ALREADY_EXISTS: 'SUPPLIER_ALREADY_EXISTS',

    // Validation errors
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_INPUT: 'INVALID_INPUT',
    MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

    // Server errors
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

    // Rate limiting
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
};

/**
 * Custom Application Error class
 */
export class AppError extends Error {
    constructor(message, statusCode = 500, code = ERROR_CODES.INTERNAL_SERVER_ERROR, errors = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.errors = errors; // For validation errors
        this.isOperational = true; // Distinguish from programming errors
        this.timestamp = new Date().toISOString();

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Specific error classes for common scenarios
 */

export class NotFoundError extends AppError {
    constructor(resource = 'Resource', code = ERROR_CODES.USER_NOT_FOUND) {
        super(`${resource} not found`, 404, code);
    }
}

export class ValidationError extends AppError {
    constructor(errors, message = 'Validation failed') {
        super(message, 400, ERROR_CODES.VALIDATION_ERROR, errors);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized access', code = ERROR_CODES.UNAUTHORIZED) {
        super(message, 401, code);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Access forbidden', code = ERROR_CODES.FORBIDDEN) {
        super(message, 403, code);
    }
}

export class ConflictError extends AppError {
    constructor(resource = 'Resource', code = ERROR_CODES.USER_ALREADY_EXISTS) {
        super(`${resource} already exists`, 409, code);
    }
}

export class BadRequestError extends AppError {
    constructor(message = 'Bad request', code = ERROR_CODES.INVALID_INPUT) {
        super(message, 400, code);
    }
}

export class ServiceUnavailableError extends AppError {
    constructor(service = 'Service', code = ERROR_CODES.SERVICE_UNAVAILABLE) {
        super(`${service} unavailable`, 503, code);
    }
}

/**
 * Enhanced error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
    // Default error
    let error = err;

    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message
        }));
        error = new ValidationError(errors, 'Validation failed');
    }

    // Handle Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        error = new ConflictError(`${field} already exists`, ERROR_CODES.USER_ALREADY_EXISTS);
    }

    // Handle Mongoose CastError (invalid ObjectId)
    if (err.name === 'CastError') {
        error = new BadRequestError(`Invalid ${err.path}: ${err.value}`);
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        error = new UnauthorizedError('Invalid token', ERROR_CODES.INVALID_TOKEN);
    }

    if (err.name === 'TokenExpiredError') {
        error = new UnauthorizedError('Token expired', ERROR_CODES.TOKEN_EXPIRED);
    }

    // Log error (only log stack in development)
    if (process.env.NODE_ENV === 'development') {
        console.error('Error:', err);
    }

    // Send error response
    const statusCode = error.statusCode || 500;
    const response = {
        success: false,
        error: {
            code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: error.message || 'Internal server error',
            ...(error.errors && { details: error.errors }),
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
            timestamp: error.timestamp || new Date().toISOString(),
        }
    };

    res.status(statusCode).json(response);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};