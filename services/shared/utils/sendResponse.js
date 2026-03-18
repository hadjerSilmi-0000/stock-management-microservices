/**
 * Standardized response helper
 * Every controller must use this — never call res.json() directly.
 *
 * Envelope shape:
 *   { success: true,  data, message?, pagination? }
 *   { success: false, error: { code, message, details?, timestamp } }
 *
 * services/shared/utils/sendResponse.js
 */

/**
 * Send a successful response.
 *
 * @param {import('express').Response} res
 * @param {number}  statusCode   HTTP status (default 200)
 * @param {*}       data         Payload — object, array, or null
 * @param {string}  [message]    Optional human-readable note
 * @param {object}  [pagination] { page, limit, total, totalPages, hasNextPage, hasPrevPage }
 */
export const sendSuccess = (res, statusCode = 200, data = null, message = null, pagination = null) => {
    const body = { success: true, data };

    if (message)    body.message    = message;
    if (pagination) body.pagination = pagination;

    return res.status(statusCode).json(body);
};

/**
 * Send an error response.
 *
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 * @param {string} [code]    Machine-readable error code
 * @param {*}      [details] Validation errors array, etc.
 */
export const sendError = (res, statusCode = 500, message = 'Internal server error', code = 'INTERNAL_SERVER_ERROR', details = null) => {
    const body = {
        success: false,
        error: {
            code,
            message,
            timestamp: new Date().toISOString(),
        },
    };

    if (details) body.error.details = details;

    return res.status(statusCode).json(body);
};

/**
 * Build a pagination object from query params + total count.
 * Pass the result straight into sendSuccess() as the pagination argument.
 *
 * @param {number} page
 * @param {number} limit
 * @param {number} total
 */
export const buildPagination = (page, limit, total) => {
    const totalPages = Math.ceil(total / limit);
    return {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
    };
};
