import crypto from 'crypto';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
const SERVICE_KEYS = {
    'users-service': process.env.USERS_SERVICE_KEY || 'dev_users_key_change_in_prod',
    'products-service': process.env.PRODUCTS_SERVICE_KEY || 'dev_products_key_change_in_prod',
    'stock-service': process.env.STOCK_SERVICE_KEY || 'dev_stock_key_change_in_prod',
    'suppliers-service': process.env.SUPPLIERS_SERVICE_KEY || 'dev_suppliers_key_change_in_prod',
};

/**
 * Generate a secure API key
 */
export const generateServiceKey = (serviceName) => {
    const key = crypto.randomBytes(32).toString('hex');
    console.log(`Generated API Key for ${serviceName}:`, key);
    return key;
};

/**
 * Middleware to validate service-to-service requests
 * Checks X-Service-Key header
 */
export const serviceAuthMiddleware = (req, res, next) => {
    try {
        const serviceKey = req.headers['x-service-key'];
        const serviceName = req.headers['x-service-name'];

        // Check if headers are present
        if (!serviceKey || !serviceName) {
            throw new UnauthorizedError('Service authentication required');
        }

        // Validate service key
        const expectedKey = SERVICE_KEYS[serviceName];
        if (!expectedKey || serviceKey !== expectedKey) {
            throw new ForbiddenError('Invalid service credentials');
        }

        // Attach service info to request
        req.serviceAuth = {
            serviceName,
            authenticated: true,
        };

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Optional service auth (allows both user and service auth)
 */
export const optionalServiceAuth = (req, res, next) => {
    const serviceKey = req.headers['x-service-key'];
    const serviceName = req.headers['x-service-name'];

    if (serviceKey && serviceName) {
        // Try service auth
        const expectedKey = SERVICE_KEYS[serviceName];
        if (expectedKey && serviceKey === expectedKey) {
            req.serviceAuth = {
                serviceName,
                authenticated: true,
            };
        }
    }

    next();
};

/**
 * Helper to make authenticated service-to-service requests
 */
export const createServiceClient = (serviceName) => {
    const apiKey = SERVICE_KEYS[serviceName];
    const currentService = process.env.SERVICE_NAME || 'unknown-service';

    return {
        headers: {
            'X-Service-Key': SERVICE_KEYS[currentService],
            'X-Service-Name': currentService,
            'Content-Type': 'application/json',
        },
        serviceName,
        currentService,
    };
};

/**
 * Example usage for axios with service auth
 */
export const getServiceHeaders = () => {
    const currentService = process.env.SERVICE_NAME || 'unknown-service';
    const apiKey = SERVICE_KEYS[currentService];

    return {
        'X-Service-Key': apiKey,
        'X-Service-Name': currentService,
    };
};