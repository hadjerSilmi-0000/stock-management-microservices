/**
 * Event Types and Exchanges for Microservices
 * Place in: services/shared/events/eventTypes.js
 */

// =========================================================================
// EVENT NAMES
// Use dot notation: entity.action
// =========================================================================

export const EVENTS = {
    // ===== PRODUCT EVENTS =====
    PRODUCT_CREATED: 'product.created',
    PRODUCT_UPDATED: 'product.updated',
    PRODUCT_DELETED: 'product.deleted',
    PRODUCT_PRICE_CHANGED: 'product.price.changed',
    PRODUCT_CATEGORY_CHANGED: 'product.category.changed',

    // ===== STOCK EVENTS =====
    STOCK_CREATED: 'stock.created',
    STOCK_UPDATED: 'stock.updated',
    STOCK_INCREASED: 'stock.increased',
    STOCK_DECREASED: 'stock.decreased',
    STOCK_LOW: 'stock.low',              // Stock below minimum
    STOCK_OUT: 'stock.out',              // Stock = 0
    STOCK_CRITICAL: 'stock.critical',    // Urgent reorder needed
    STOCK_MOVEMENT_IN: 'stock.movement.in',
    STOCK_MOVEMENT_OUT: 'stock.movement.out',

    // ===== SUPPLIER EVENTS =====
    SUPPLIER_CREATED: 'supplier.created',
    SUPPLIER_UPDATED: 'supplier.updated',
    SUPPLIER_DELETED: 'supplier.deleted',
    SUPPLIER_ACTIVATED: 'supplier.activated',
    SUPPLIER_DEACTIVATED: 'supplier.deactivated',

    // ===== ORDER EVENTS (Future) =====
    ORDER_CREATED: 'order.created',
    ORDER_CONFIRMED: 'order.confirmed',
    ORDER_FULFILLED: 'order.fulfilled',
    ORDER_CANCELLED: 'order.cancelled',

    // ===== USER EVENTS =====
    USER_CREATED: 'user.created',
    USER_UPDATED: 'user.updated',
    USER_DELETED: 'user.deleted',
    USER_LOGIN: 'user.login',
    USER_LOGOUT: 'user.logout',
    USER_ROLE_CHANGED: 'user.role.changed',
};

// =========================================================================
// EXCHANGES
// Each service has its own exchange
// =========================================================================

export const EXCHANGES = {
    PRODUCTS: 'products.exchange',
    STOCK: 'stock.exchange',
    SUPPLIERS: 'suppliers.exchange',
    USERS: 'users.exchange',
    ORDERS: 'orders.exchange', // Future
};

// =========================================================================
// ROUTING KEYS
// Patterns for subscribing to specific events
// Wildcards: * (exactly one word), # (zero or more words)
// =========================================================================

export const ROUTING_KEYS = {
    // All product events
    ALL_PRODUCTS: 'product.*',

    // All stock events
    ALL_STOCK: 'stock.*',

    // All stock movements
    STOCK_MOVEMENTS: 'stock.movement.*',

    // All supplier events
    ALL_SUPPLIERS: 'supplier.*',

    // All user events
    ALL_USERS: 'user.*',

    // Critical events only
    CRITICAL: '*.critical',

    // All events from all services
    ALL_EVENTS: '#',
};

// =========================================================================
// QUEUE NAMES
// Convention: {service-name}.{event-category}
// =========================================================================

export const QUEUES = {
    // Stock Service Queues
    STOCK_PRODUCT_EVENTS: 'stock-service.product-events',
    STOCK_SUPPLIER_EVENTS: 'stock-service.supplier-events',

    // Suppliers Service Queues
    SUPPLIERS_STOCK_EVENTS: 'suppliers-service.stock-events',
    SUPPLIERS_PRODUCT_EVENTS: 'suppliers-service.product-events',

    // Products Service Queues
    PRODUCTS_STOCK_EVENTS: 'products-service.stock-events',

    // Users Service Queues (Future)
    USERS_AUDIT_EVENTS: 'users-service.audit-events',

    // Notification Service Queue (Future)
    NOTIFICATIONS_ALL: 'notifications-service.all-events',
};

// =========================================================================
// EVENT PAYLOAD SCHEMAS
// Document expected structure for each event type
// =========================================================================

export const EVENT_SCHEMAS = {
    PRODUCT_CREATED: {
        productId: 'string (MongoDB ObjectId)',
        sku: 'string (unique)',
        name: 'string',
        description: 'string (optional)',
        category: 'string',
        price: 'number',
        createdBy: 'string (userId)',
        timestamp: 'ISO 8601 string',
    },

    PRODUCT_UPDATED: {
        productId: 'string',
        changes: {
            // Only include changed fields
            name: 'string (optional)',
            price: 'number (optional)',
            category: 'string (optional)',
            // ... etc
        },
        updatedBy: 'string (userId)',
        timestamp: 'ISO 8601 string',
    },

    STOCK_LOW: {
        productId: 'string',
        sku: 'string',
        currentQuantity: 'number',
        minimumStock: 'number',
        location: 'string',
        severity: 'string (low|critical)',
        timestamp: 'ISO 8601 string',
    },

    STOCK_MOVEMENT_IN: {
        productId: 'string',
        quantity: 'number',
        fromLocation: 'string (optional)',
        toLocation: 'string',
        reason: 'string (purchase|transfer|return)',
        supplierId: 'string (optional)',
        reference: 'string (PO number, etc)',
        performedBy: 'string (userId)',
        timestamp: 'ISO 8601 string',
    },

    STOCK_MOVEMENT_OUT: {
        productId: 'string',
        quantity: 'number',
        fromLocation: 'string',
        toLocation: 'string (optional)',
        reason: 'string (sale|transfer|damage|return)',
        reference: 'string (order number, etc)',
        performedBy: 'string (userId)',
        timestamp: 'ISO 8601 string',
    },
};

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

/**
 * Create a standardized event payload
 */
export function createEvent(eventType, data, metadata = {}) {
    return {
        eventType,
        eventId: generateEventId(),
        timestamp: new Date().toISOString(),
        data,
        metadata: {
            source: process.env.SERVICE_NAME || 'unknown',
            version: '1.0',
            ...metadata,
        },
    };
}

/**
 * Generate unique event ID
 */
function generateEventId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Validate event payload against schema
 * @param {string} eventType
 * @param {object} data
 * @returns {boolean}
 */
export function validateEvent(eventType, data) {
    const schema = EVENT_SCHEMAS[eventType];
    if (!schema) {
        console.warn(`⚠️ No schema defined for event: ${eventType}`);
        return true; // Allow events without schemas
    }

    // Basic validation - check required fields exist
    const requiredFields = Object.keys(schema).filter(
        key => !schema[key].includes('optional')
    );

    for (const field of requiredFields) {
        if (!(field in data)) {
            console.error(`❌ Event validation failed: Missing field '${field}' in ${eventType}`);
            return false;
        }
    }

    return true;
}

/**
 * Get exchange name for an event type
 */
export function getExchangeForEvent(eventType) {
    const [entity] = eventType.split('.');

    switch (entity) {
        case 'product':
            return EXCHANGES.PRODUCTS;
        case 'stock':
            return EXCHANGES.STOCK;
        case 'supplier':
            return EXCHANGES.SUPPLIERS;
        case 'user':
            return EXCHANGES.USERS;
        case 'order':
            return EXCHANGES.ORDERS;
        default:
            throw new Error(`Unknown entity in event type: ${eventType}`);
    }
}

// =========================================================================
// EXAMPLE USAGE
// =========================================================================

/*

// Publishing an event
import RabbitMQClient from '../utils/rabbitmqClient.js';
import { EVENTS, EXCHANGES, createEvent } from '../events/eventTypes.js';

const rabbitMQ = new RabbitMQClient();

const eventData = {
    productId: '507f1f77bcf86cd799439011',
    sku: 'WIDGET-001',
    currentQuantity: 5,
    minimumStock: 10,
    location: 'Warehouse A',
    severity: 'low',
};

const event = createEvent(EVENTS.STOCK_LOW, eventData);

await rabbitMQ.publish(
    EXCHANGES.STOCK,
    EVENTS.STOCK_LOW,
    event
);

// Subscribing to events
import { EVENTS, EXCHANGES, QUEUES } from '../events/eventTypes.js';

await rabbitMQ.subscribe(
    EXCHANGES.STOCK,
    QUEUES.SUPPLIERS_STOCK_EVENTS,
    EVENTS.STOCK_LOW,
    async (event) => {
        console.log('Low stock alert:', event.data);
        // Notify supplier, create purchase order, etc.
    }
);

*/