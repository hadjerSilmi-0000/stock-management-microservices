/**
 * Suppliers Service - Event Subscribers
 * File: services/suppliers/src/events/subscribers.js
 * 
 * PURPOSE:
 * - Listen to STOCK events (low stock, critical stock, out of stock)
 * - Trigger supplier notifications and purchase order workflows
 */

import Supplier from "../models/supplierModel.js";
import logger from "../utils/logger.js";
import { EVENTS, EXCHANGES, QUEUES } from "../../shared/events/eventTypes.js";

/**
 * Setup all event subscribers for Suppliers service
 * @param {RabbitMQClient} rabbitMQ 
 */
export async function setupSuppliersEventSubscribers(rabbitMQ) {
    logger.info("📡 Setting up Suppliers service event subscribers...");

    try {
        // Ensure Stock exchange exists
        await rabbitMQ.createExchange(EXCHANGES.STOCK, "topic");

        // ════════════════════════════════════════════════════════════════
        // Subscribe to STOCK_LOW
        // ════════════════════════════════════════════════════════════════
        await rabbitMQ.subscribe(
            EXCHANGES.STOCK,
            QUEUES.SUPPLIERS_STOCK_EVENTS,
            EVENTS.STOCK_LOW,
            async (event) => {
                try {
                    logger.warn(`🟡 LOW STOCK ALERT received for: ${event.data.sku}`);
                    logger.info(`   Product ID: ${event.data.productId}`);
                    logger.info(`   Current: ${event.data.currentQuantity} units`);
                    logger.info(`   Minimum: ${event.data.minimumStock} units`);

                    // TODO: Implement actual notification logic
                    // For now, just log the alert
                    await handleLowStockAlert(event.data);

                } catch (error) {
                    logger.error(`❌ Error handling STOCK_LOW event: ${error.message}`);
                    throw error;
                }
            }
        );

        // ════════════════════════════════════════════════════════════════
        // Subscribe to STOCK_CRITICAL
        // ════════════════════════════════════════════════════════════════
        await rabbitMQ.subscribe(
            EXCHANGES.STOCK,
            QUEUES.SUPPLIERS_STOCK_EVENTS,
            EVENTS.STOCK_CRITICAL,
            async (event) => {
                try {
                    logger.error(`🔴 CRITICAL STOCK ALERT received for: ${event.data.sku}`);
                    logger.error(`   Product ID: ${event.data.productId}`);
                    logger.error(`   Current: ${event.data.currentQuantity} units`);
                    logger.error(`   Minimum: ${event.data.minimumStock} units`);
                    logger.error(`   ⚠️ URGENT ACTION REQUIRED!`);

                    // TODO: Implement urgent notification
                    await handleCriticalStockAlert(event.data);

                } catch (error) {
                    logger.error(`❌ Error handling STOCK_CRITICAL event: ${error.message}`);
                    throw error;
                }
            }
        );

        // ════════════════════════════════════════════════════════════════
        // Subscribe to STOCK_OUT
        // ════════════════════════════════════════════════════════════════
        await rabbitMQ.subscribe(
            EXCHANGES.STOCK,
            QUEUES.SUPPLIERS_STOCK_EVENTS,
            EVENTS.STOCK_OUT,
            async (event) => {
                try {
                    logger.error(`🚨 OUT OF STOCK ALERT received for: ${event.data.sku}`);
                    logger.error(`   Product ID: ${event.data.productId}`);
                    logger.error(`   Product Name: ${event.data.name}`);
                    logger.error(`   Location: ${event.data.location}`);
                    logger.error(`   🔴 IMMEDIATE RESTOCKING REQUIRED!`);

                    // TODO: Implement emergency order
                    await handleOutOfStockAlert(event.data);

                } catch (error) {
                    logger.error(`❌ Error handling STOCK_OUT event: ${error.message}`);
                    throw error;
                }
            }
        );

        // ════════════════════════════════════════════════════════════════
        // Subscribe to PRODUCT_CREATED (to establish supplier relationships)
        // ════════════════════════════════════════════════════════════════
        await rabbitMQ.createExchange(EXCHANGES.PRODUCTS, "topic");
        await rabbitMQ.subscribe(
            EXCHANGES.PRODUCTS,
            QUEUES.SUPPLIERS_PRODUCT_EVENTS,
            EVENTS.PRODUCT_CREATED,
            async (event) => {
                try {
                    logger.info(`📥 Received PRODUCT_CREATED event for: ${event.data.sku}`);

                    if (event.data.supplierId) {
                        // Verify supplier exists
                        const supplier = await Supplier.findById(event.data.supplierId);

                        if (supplier) {
                            logger.info(`✅ Product ${event.data.sku} linked to supplier: ${supplier.name}`);
                        } else {
                            logger.warn(`⚠️ Product ${event.data.sku} references non-existent supplier: ${event.data.supplierId}`);
                        }
                    }

                } catch (error) {
                    logger.error(`❌ Error handling PRODUCT_CREATED event: ${error.message}`);
                    // Don't throw - this is not critical
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
 * TODO: Implement actual notification logic
 */
async function handleLowStockAlert(data) {
    logger.info(`📋 Processing low stock alert for ${data.sku}...`);

    // TODO: Implementation ideas:
    // 1. Find supplier for this product
    // 2. Create draft purchase order
    // 3. Send email to procurement team
    // 4. Add to "needs review" queue

    logger.info(`   Suggested action: Create purchase order for ${data.minimumStock * 2} units`);
}

/**
 * Handle critical stock alert
 * TODO: Implement urgent notification
 */
async function handleCriticalStockAlert(data) {
    logger.warn(`🚨 Processing CRITICAL stock alert for ${data.sku}...`);

    // TODO: Implementation ideas:
    // 1. Find all suppliers for this product
    // 2. Send urgent email to procurement manager
    // 3. Create priority purchase order
    // 4. Send SMS/Slack notification
    // 5. Escalate to management if not resolved in 24h

    const urgentQuantity = Math.max(data.minimumStock * 3, 100);
    logger.warn(`   URGENT: Order ${urgentQuantity} units immediately!`);
}

/**
 * Handle out of stock alert
 * TODO: Implement emergency order flow
 */
async function handleOutOfStockAlert(data) {
    logger.error(`🔴 Processing OUT OF STOCK alert for ${data.sku}...`);



    logger.error(`   EMERGENCY: Product ${data.name} is completely out of stock!`);
    logger.error(`   Action: Initiate emergency restocking procedure`);
}