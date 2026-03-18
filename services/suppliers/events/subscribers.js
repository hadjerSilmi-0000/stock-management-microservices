/**
 * Suppliers Service - Event Subscribers
 * File: services/suppliers/src/events/subscribers.js
 */
import Supplier from "../src/models/supplierModel.js";
import logger from "../src/utils/logger.js";
import { EVENTS, EXCHANGES, QUEUES } from "../../shared/events/eventTypes.js";
/**
 * Setup all event subscribers for Suppliers service
 * @param {RabbitMQClient} rabbitMQ
 */
export async function setupSuppliersEventSubscribers(rabbitMQ) {
    logger.info("📡 Setting up Suppliers service event subscribers...");

    try {
        await rabbitMQ.createExchange(EXCHANGES.STOCK, "topic");

        // ════════════════════════════════════════════════════════════════
        // STOCK_LOW
        // ════════════════════════════════════════════════════════════════
        await rabbitMQ.subscribe(
            EXCHANGES.STOCK,
            QUEUES.SUPPLIERS_STOCK_EVENTS,
            EVENTS.STOCK_LOW,
            async (event) => {
                try {
                    logger.warn(`🟡 LOW STOCK ALERT for: ${event.data.sku} — ${event.data.currentQuantity} units left`);
                    await handleLowStockAlert(event.data);
                } catch (error) {
                    logger.error(`❌ Error handling STOCK_LOW: ${error.message}`);
                    throw error;
                }
            }
        );

        // ════════════════════════════════════════════════════════════════
        // STOCK_CRITICAL
        // ════════════════════════════════════════════════════════════════
        await rabbitMQ.subscribe(
            EXCHANGES.STOCK,
            QUEUES.SUPPLIERS_STOCK_EVENTS,
            EVENTS.STOCK_CRITICAL,
            async (event) => {
                try {
                    logger.error(`🔴 CRITICAL STOCK for: ${event.data.sku} — only ${event.data.currentQuantity} units remaining`);
                    await handleCriticalStockAlert(event.data);
                } catch (error) {
                    logger.error(`❌ Error handling STOCK_CRITICAL: ${error.message}`);
                    throw error;
                }
            }
        );

        // ════════════════════════════════════════════════════════════════
        // STOCK_OUT
        // ════════════════════════════════════════════════════════════════
        await rabbitMQ.subscribe(
            EXCHANGES.STOCK,
            QUEUES.SUPPLIERS_STOCK_EVENTS,
            EVENTS.STOCK_OUT,
            async (event) => {
                try {
                    logger.error(`🚨 OUT OF STOCK: ${event.data.sku} — ${event.data.name}`);
                    await handleOutOfStockAlert(event.data);
                } catch (error) {
                    logger.error(`❌ Error handling STOCK_OUT: ${error.message}`);
                    throw error;
                }
            }
        );

        // ════════════════════════════════════════════════════════════════
        // PRODUCT_CREATED — verify supplier link
        // ════════════════════════════════════════════════════════════════
        await rabbitMQ.createExchange(EXCHANGES.PRODUCTS, "topic");
        await rabbitMQ.subscribe(
            EXCHANGES.PRODUCTS,
            QUEUES.SUPPLIERS_PRODUCT_EVENTS,
            EVENTS.PRODUCT_CREATED,
            async (event) => {
                try {
                    logger.info(`📥 PRODUCT_CREATED event for: ${event.data.sku}`);

                    if (event.data.supplierId) {
                        const supplier = await Supplier.findById(event.data.supplierId);

                        if (supplier) {
                            logger.info(`✅ Product ${event.data.sku} linked to supplier: ${supplier.name}`);
                        } else {
                            logger.warn(`⚠️ Product ${event.data.sku} references non-existent supplier: ${event.data.supplierId}`);
                        }
                    }
                } catch (error) {
                    logger.error(`❌ Error handling PRODUCT_CREATED: ${error.message}`);
                }
            }
        );

        logger.info("✅ Suppliers service event subscribers setup complete");

    } catch (error) {
        logger.error(`❌ Failed to setup Suppliers event subscribers: ${error.message}`);
        throw error;
    }
}

// ════════════════════════════════════════════════════════════════
// ALERT HANDLERS
// ════════════════════════════════════════════════════════════════

/**
 * Handle low stock alert
 * Finds the supplier for this product and logs a restocking recommendation
 */
async function handleLowStockAlert(data) {
    try {
        // Find supplier linked to this product via supplierId stored in the event
        // If supplierId is not in event data, we do a best-effort lookup
        const suggestedQty = (data.minimumStock || 10) * 2;

        logger.info(`📋 [LOW STOCK] Product: ${data.sku}`);
        logger.info(`   Current: ${data.currentQuantity} / Minimum: ${data.minimumStock}`);
        logger.info(`   Suggested reorder quantity: ${suggestedQty} units`);
        logger.info(`   Action: Create purchase order for product ${data.productId}`);

        // Future: send email to procurement team, create draft PO, etc.
    } catch (error) {
        logger.error(`handleLowStockAlert error: ${error.message}`);
    }
}

/**
 * Handle critical stock alert
 * Urgent — logs an escalation notice with priority order quantity
 */
async function handleCriticalStockAlert(data) {
    try {
        const urgentQty = Math.max((data.minimumStock || 10) * 3, 100);

        logger.warn(`🚨 [CRITICAL STOCK] Product: ${data.sku}`);
        logger.warn(`   Current: ${data.currentQuantity} / Minimum: ${data.minimumStock}`);
        logger.warn(`   URGENT reorder quantity: ${urgentQty} units`);
        logger.warn(`   Action: Priority purchase order required immediately`);

        // Future: send SMS/Slack notification to manager, escalate to admin
    } catch (error) {
        logger.error(`handleCriticalStockAlert error: ${error.message}`);
    }
}

/**
 * Handle out-of-stock alert
 * Emergency — product completely exhausted
 */
async function handleOutOfStockAlert(data) {
    try {
        logger.error(`🔴 [OUT OF STOCK] Product: ${data.sku} — ${data.name}`);
        logger.error(`   Location: ${data.location || 'Main Warehouse'}`);
        logger.error(`   Action: EMERGENCY restocking procedure — contact supplier immediately`);

        // Future: auto-create emergency purchase order, notify all admins
    } catch (error) {
        logger.error(`handleOutOfStockAlert error: ${error.message}`);
    }
}